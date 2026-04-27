import * as XLSX from 'xlsx';
import fs from 'fs/promises';
import PQueue from 'p-queue';
import { prisma } from '../../db_connection';

import axios from 'axios';

// Controlled concurrency queue (limit 5 files at a time)
const excelProcessingQueue = new PQueue({ concurrency: 5 });

const parseExcelFile = async (filePath: string) => {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; 
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);
    return data;
  } catch (error: any) {
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
};

const fetchGeodata = async (postcode: string) => {
  if (!postcode) return null;
  try {
    const response = await axios.get(`https://api.postcodes.io/postcodes/${postcode.trim()}`);
    if (response.data.status === 200) {
      const { latitude, longitude, region, admin_district, country } = response.data.result;
      return { latitude, longitude, region, district: admin_district, country };
    }
    return null;
  } catch (error) {
    return null; // Silently fail geocoding to not block the whole import
  }
};

const processExcelFiles = async (files: Express.Multer.File[], userId: string) => {
  const results = await Promise.all(
    files.map(file =>
      excelProcessingQueue.add(async () => {
        try {
          const jsonData = await parseExcelFile(file.path) as any[];
          
          // 2. Filter out duplicates based on OrganizationName and LocalAuthority
          if (Array.isArray(jsonData)) {
            // Fetch existing payloads for this user to check for duplicates
            const existingImports = await prisma.importedOrganization.findMany({
              where: { userId },
              select: { payload: true }
            });

            // Create a set of existing "Name|Authority" keys for fast lookup
            const existingKeys = new Set(
              existingImports.map(imp => {
                const p = imp.payload as any;
                return `${p?.OrganizationName || ''}|${p?.LocalAuthority || ''}`.toLowerCase().trim();
              })
            );

            // Filter and Geocode the new data
            const uniqueNewData = [];
            for (const item of jsonData) {
              const key = `${item.OrganizationName || ''}|${item.LocalAuthority || ''}`.toLowerCase().trim();
              if (!existingKeys.has(key)) {
                // Fetch geodata for new items
                const geodata = await fetchGeodata(item.Postcode || item.postcode);
                uniqueNewData.push({
                  userId,
                  payload: item as any,
                  ...geodata
                });
                existingKeys.add(key);
              }
            }

            if (uniqueNewData.length > 0) {
              await prisma.importedOrganization.createMany({
                data: uniqueNewData
              });
            }

            await fs.unlink(file.path);
            return {
              fileName: file.originalname,
              rowCount: uniqueNewData.length,
              skippedCount: jsonData.length - uniqueNewData.length
            };
          }
        } catch (error: any) {
          try {
            await fs.unlink(file.path);
          } catch (cleanupError) {
            console.error(`Cleanup failed for ${file.path}:`, cleanupError);
          }
          return {
            fileName: file.originalname,
            error: error.message,
          };
        }
      })
    )
  );

  return results;
};

// CRUD operations for Individual Imported Organizations
const getAllImports = async (userId: string) => {
  const result = await prisma.importedOrganization.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  // Transform to the requested format (showing payload data with unique ID)
  return result.map(item => {
    const payload = item.payload as object;
    return {
      id: item.id, // The unique ID for this specific item
      ...payload,
      createdAt: item.createdAt
    };
  });
};

const deleteImport = async (id: string, userId: string) => {
  const result = await prisma.importedOrganization.delete({
    where: { id, userId },
  });
  return result;
};

export const importOrganizationServices = {
  processExcelFiles,
  getAllImports,
  deleteImport,
};
