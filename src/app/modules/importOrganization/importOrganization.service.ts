import * as XLSX from 'xlsx';
import fs from 'fs/promises';
import PQueue from 'p-queue';
import { prisma } from '../../db_connection';
import { activityLogServices } from '../activityLog/activityLog.service';

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
            let count = 0;
            for (const item of jsonData) {
              count++;
              console.log(`[Import] Item ${count} start...`);

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
              console.log(`[Import] Item ${count} done.✅`);
            }

            if (uniqueNewData.length > 0) {
              // We use a loop instead of createMany to get the IDs back for linking contacts
              for (const orgData of uniqueNewData) {
                const createdOrg = await prisma.importedOrganization.create({
                  data: orgData
                });

                // Link existing contacts that match this organization
                const payload = orgData.payload as any;
                const orgName = payload.OrganizationName;
                const localAuthority = payload.LocalAuthority;

                if (orgName && localAuthority) {
                  // Link contacts that match this organization using the new dedicated fields
                  // @ts-ignore
                  const updatedContacts = await prisma.importContact.updateMany({
                    where: {
                      userId,
                      organizationName: orgName,
                      localAuthority: localAuthority,
                      importedOrganizationId: null,
                    } as any,
                    data: {
                      importedOrganizationId: createdOrg.id
                    }
                  });

                  if (updatedContacts.count > 0) {
                    console.log(`[Link] Linked ${updatedContacts.count} existing contacts to new organization: ${orgName}`);
                  }
                }
              }
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

  // Log the activity
  const totalImported = results.reduce((acc, curr: any) => acc + (curr && 'rowCount' in curr ? (curr.rowCount || 0) : 0), 0);
  await activityLogServices.createLog(
    userId,
    "ORGANIZATION_IMPORT",
    `Imported ${totalImported} organizations from ${files.length} files.`,
    { fileCount: files.length, totalImported }
  );

  return results;
};

// CRUD operations for Individual Imported Organizations
const getAllImports = async (userId: string, query: any) => {
  const { searchTerm, localAuthority, region, gender, phase, page = 1, limit = 10 } = query;

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const where: any = {
    userId,
  };

  // Construct AND array for multiple filters
  const andConditions: any[] = [];

  if (searchTerm) {
    andConditions.push({
      payload: {
        path: ['OrganizationName'],
        string_contains: searchTerm,
      },
    });
  }

  if (localAuthority) {
    andConditions.push({
      payload: {
        path: ['LocalAuthority'],
        string_contains: localAuthority,
      },
    });
  }

  if (gender) {
    andConditions.push({
      payload: {
        path: ['Gender'],
        string_contains: gender,
      },
    });
  }

  if (phase) {
    andConditions.push({
      payload: {
        path: ['Phase'],
        string_contains: phase,
      },
    });
  }

  if (region) {
    andConditions.push({
      region: {
        contains: region,
        mode: 'insensitive',
      },
    });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  const result = await prisma.importedOrganization.findMany({
    where,
    include: {
      _count: {
        select: { contacts: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    // Pagination will be handled in memory for merging
  });

  // Fetch manual organizations
  const manualOrgs = await prisma.organization.findMany({
    where: searchTerm ? {
      name: { contains: searchTerm, mode: 'insensitive' }
    } : {},
    include: {
      _count: {
        select: { contacts: true }
      }
    }
  });

  // Map manual organizations to match imported format
  const mappedManual = manualOrgs.map(org => ({
    id: org.id,
    OrganizationName: org.name,
    LocalAuthority: org.localAuthority,
    Postcode: org.postcode,
    latitude: org.latitude ? parseFloat(org.latitude) : null,
    longitude: org.longitude ? parseFloat(org.longitude) : null,
    region: null, // Organization table doesn't have region
    district: org.town,
    country: org.country,
    contactCount: org._count?.contacts || 0,
    isManual: true,
    createdAt: org.createdAt
  }));

  // Map imported organizations
  const mappedImported = result.map(item => ({
    id: item.id,
    ...(item.payload as object),
    latitude: item.latitude,
    longitude: item.longitude,
    region: item.region,
    district: item.district,
    country: item.country,
    contactCount: (item as any)._count?.contacts || 0,
    isManual: false,
    createdAt: item.createdAt
  }));

  // Combine and sort
  const combined = [...mappedManual, ...mappedImported].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const total = combined.length;
  const paginatedData = combined.slice(skip, skip + take);

  return {
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPage: Math.ceil(total / Number(limit)),
    },
    data: paginatedData,
  };
};

const getImportById = async (id: string, userId: string) => {
  const result = await prisma.importedOrganization.findFirst({
    where: { id, userId },
    include: {
      contacts: true,
      _count: {
        select: { contacts: true }
      }
    }
  });

  if (!result) return null;

  const payload = result.payload as object;
  return {
    id: result.id,
    ...payload,
    latitude: result.latitude,
    longitude: result.longitude,
    region: result.region,
    district: result.district,
    country: result.country,
    contactCount: (result as any)._count?.contacts || 0,
    contacts: result.contacts.map(c => ({
      id: c.id,
      ...(c.payload as object),
      createdAt: c.createdAt
    })),
    createdAt: result.createdAt
  };
};



const updateImport = async (id: string, userId: string, data: any) => {
  const { payload, ...rootFields } = data;

  const result = await prisma.importedOrganization.updateMany({
    where: { id, userId },
    data: {
      ...rootFields,
      ...(payload && { payload: payload })
    }
  });
  return result;
};

const deleteImport = async (id: string, userId: string) => {
  const result = await prisma.importedOrganization.deleteMany({
    where: { id, userId },
  });
  return result;
};

const deleteAllImports = async (userId: string) => {
  const result = await prisma.importedOrganization.deleteMany({
    where: { userId },
  });
  return result;
};

export const importOrganizationServices = {
  processExcelFiles,
  getAllImports,
  getImportById,
  updateImport,
  deleteImport,
  deleteAllImports,
};
