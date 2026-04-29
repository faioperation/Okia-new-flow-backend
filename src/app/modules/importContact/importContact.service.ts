import * as XLSX from 'xlsx';
import fs from 'fs/promises';
import PQueue from 'p-queue';
import { prisma } from '../../db_connection';
import { activityLogServices } from '../activityLog/activityLog.service';

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
  // 1. Fetch existing organizations for linking
  const existingOrgs = await prisma.importedOrganization.findMany({
    where: { userId },
    select: { id: true, payload: true }
  });

  // Create a lookup map for organizations (Key: "NormalizedName|Authority")
  const orgLookup = new Map();
  const normalizeName = (name: string) => (name || '').toLowerCase().replace(/\s+school$/i, '').trim();

  existingOrgs.forEach(org => {
    const p = org.payload as any;
    const key = `${normalizeName(p?.OrganizationName)}|${(p?.LocalAuthority || '').toLowerCase().trim()}`;
    orgLookup.set(key, org.id);
  });

  const results = await Promise.all(
    files.map(file =>
      excelProcessingQueue.add(async () => {
        try {
          const jsonData = await parseExcelFile(file.path) as any[];

          if (Array.isArray(jsonData)) {
            const mappedData = jsonData.map(item => {
              const orgName = item.OrganizationName || null;
              const localAuth = item.LocalAuthority || null;

              const key = `${normalizeName(orgName)}|${(localAuth || '').toLowerCase().trim()}`;
              const orgId = orgLookup.get(key) || null;

              return {
                userId,
                payload: item as any,
                organizationName: normalizeName(orgName),
                localAuthority: (localAuth || '').trim(),
                importedOrganizationId: orgId
              } as any;
            });

            await prisma.importContact.createMany({
              data: mappedData
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

  // Log the activity
  const totalImported = results.reduce((acc, curr) => acc + (curr.rowCount || 0), 0);
  await activityLogServices.createLog(
    userId,
    "CONTACT_IMPORT",
    `Imported ${totalImported} contacts from ${files.length} files.`,
    { fileCount: files.length, totalImported }
  );

  return results;
};

const getAllImports = async (userId: string, query: any) => {
  const { searchTerm, localAuthority, region, gender, phase, page = 1, limit = 10 } = query;

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const where: any = {
    userId,
  };

  const andConditions: any[] = [];

  if (searchTerm) {
    andConditions.push({
      organizationName: {
        contains: searchTerm,
        mode: 'insensitive',
      },
    });
  }

  if (localAuthority) {
    andConditions.push({
      localAuthority: {
        contains: localAuthority,
        mode: 'insensitive',
      },
    });
  }

  if (gender) {
    andConditions.push({
      importedOrganization: {
        payload: {
          path: ['Gender'],
          string_contains: gender,
        },
      },
    });
  }

  if (phase) {
    andConditions.push({
      importedOrganization: {
        payload: {
          path: ['Phase'],
          string_contains: phase,
        },
      },
    });
  }

  if (region) {
    andConditions.push({
      importedOrganization: {
        region: {
          contains: region,
          mode: 'insensitive',
        },
      },
    });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  const result = await prisma.importContact.findMany({
    where,
    include: {
      importedOrganization: {
        select: {
          payload: true,
          latitude: true,
          longitude: true,
          region: true,
          district: true,
          country: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take,
  });

  const total = await prisma.importContact.count({ where });

  return {
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPage: Math.ceil(total / Number(limit)),
    },
    data: result.map(item => {
      const payload = item.payload as object;
      const org = item.importedOrganization;

      return {
        id: item.id,
        ...payload,
        importedOrganizationId: item.importedOrganizationId,
        organizationDetails: org ? {
          ...(org.payload as object),
          latitude: org.latitude,
          longitude: org.longitude,
          region: org.region,
          district: org.district,
          country: org.country,
        } : null,
        createdAt: item.createdAt
      };
    }),
  };
};

const deleteImport = async (id: string, userId: string) => {
  const result = await prisma.importContact.delete({
    where: { id, userId },
  });
  return result;
};

const deleteAllImports = async (userId: string) => {
  const result = await prisma.importContact.deleteMany({
    where: { userId },
  });
  return result;
};

export const importContactServices = {
  processExcelFiles,
  getAllImports,
  deleteImport,
  deleteAllImports,
};
