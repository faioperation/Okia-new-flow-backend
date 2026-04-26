import * as XLSX from 'xlsx';
import fs from 'fs/promises';
import PQueue from 'p-queue';
import { prisma } from '../../db_connection';

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

const processExcelFiles = async (files: Express.Multer.File[], userId: string) => {
  const results = await Promise.all(
    files.map(file =>
      excelProcessingQueue.add(async () => {
        try {
          const jsonData = await parseExcelFile(file.path) as any[];
          
          // Save every single item under a unique ID
          if (Array.isArray(jsonData)) {
            await prisma.importedOrganization.createMany({
              data: jsonData.map(item => ({
                userId,
                payload: item as any,
              }))
            });
          }

          await fs.unlink(file.path);
          return {
            fileName: file.originalname,
            rowCount: jsonData.length,
          };
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
