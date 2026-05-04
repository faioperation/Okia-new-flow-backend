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

            let successCount = 0;
            let skippedCount = 0;

            // Process in batches of 100 for geocoding
            const batchSize = 100;
            for (let i = 0; i < jsonData.length; i += batchSize) {
              const batch = jsonData.slice(i, i + batchSize);
              
              // Filter out duplicates and items to process
              const itemsToProcess = [];
              const postcodesToFetch = [];

              for (const item of batch) {
                const key = `${item.OrganizationName || ''}|${item.LocalAuthority || ''}`.toLowerCase().trim();
                if (existingKeys.has(key)) {
                  skippedCount++;
                  continue;
                }
                itemsToProcess.push({ item, key });
                const pc = item.Postcode || item.postcode;
                if (pc) postcodesToFetch.push(pc.trim());
              }

              if (itemsToProcess.length === 0) continue;

              // Fetch geodata in bulk for this batch
              let geodataResults: any[] = [];
              if (postcodesToFetch.length > 0) {
                try {
                  const response = await axios.post(`https://api.postcodes.io/postcodes`, {
                    postcodes: postcodesToFetch
                  });
                  if (response.data.status === 200) {
                    geodataResults = response.data.result;
                  }
                } catch (e) {
                  console.error("[Geocode] Bulk fetch failed", e);
                }
              }

              // Create a map for quick geodata lookup
              const geodataMap = new Map();
              geodataResults.forEach(res => {
                if (res.result) {
                  const { latitude, longitude, region, admin_district, country } = res.result;
                  geodataMap.set(res.query.trim().toLowerCase(), { latitude, longitude, region, district: admin_district, country });
                }
              });

              // Save items individually
              for (const { item, key } of itemsToProcess) {
                try {
                  const pc = (item.Postcode || item.postcode || "").trim().toLowerCase();
                  const geodata = geodataMap.get(pc) || null;

                  const createdOrg = await prisma.importedOrganization.create({
                    data: {
                      userId,
                      payload: item as any,
                      ...geodata
                    }
                  });

                  existingKeys.add(key);
                  successCount++;

                  // Link existing contacts
                  const orgName = item.OrganizationName;
                  const localAuthority = item.LocalAuthority;
                  if (orgName && localAuthority) {
                    await prisma.importContact.updateMany({
                      where: {
                        userId,
                        organizationName: orgName.toLowerCase().replace(/\s+school$/i, '').trim(),
                        localAuthority: localAuthority.trim(),
                        importedOrganizationId: null,
                      },
                      data: {
                        importedOrganizationId: createdOrg.id
                      }
                    });
                  }
                } catch (err: any) {
                  console.error(`[Import] Failed to save organization: ${item.OrganizationName}`, err.message);
                }
              }
              console.log(`[Import] Processed batch ${Math.floor(i/batchSize) + 1}. Total success so far: ${successCount}`);
            }

            await fs.unlink(file.path);
            return {
              fileName: file.originalname,
              rowCount: successCount,
              skippedCount: skippedCount
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
    URN: org.urn,
    Town: org.town,
    Phase: org.phase,
    Gender: org.gender,
    Street: org.street,
    AddressLine1: org.address,
    TelephoneNumber: org.phone,
    latitude: org.latitude ? parseFloat(org.latitude) : null,
    longitude: org.longitude ? parseFloat(org.longitude) : null,
    region: org.town, 
    district: org.localAuthority,
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
      manualContacts: true,
      _count: {
        select: { 
          contacts: true,
          manualContacts: true
        }
      }
    }
  });

  if (result) {
    const payload = result.payload as object;
    return {
      id: result.id,
      ...payload,
      latitude: result.latitude,
      longitude: result.longitude,
      region: result.region,
      district: result.district,
      country: result.country,
      contactCount: ((result as any)._count?.contacts || 0) + ((result as any)._count?.manualContacts || 0),
      contacts: [
        ...result.contacts.map(c => ({
          id: c.id,
          ...(c.payload as object),
          isManual: false,
          createdAt: c.createdAt
        })),
        ...result.manualContacts.map(c => ({
          id: c.id,
          FullName: c.fullName,
          WorkEmail: c.email,
          WorkPhone: c.phone,
          JobTitle: c.jobTitle,
          Department: c.department,
          isManual: true,
          createdAt: c.createdAt
        }))
      ],
      isManual: false,
      createdAt: result.createdAt
    };
  }

  // If not found in imported, check manual organizations
  const manualOrg = await prisma.organization.findFirst({
    where: { id, userId },
    include: {
      contacts: true,
      importedContacts: true,
      _count: {
        select: { 
          contacts: true,
          importedContacts: true
        }
      }
    }
  });

  if (manualOrg) {
    return {
      id: manualOrg.id,
      OrganizationName: manualOrg.name,
      LocalAuthority: manualOrg.localAuthority,
      Postcode: manualOrg.postcode,
      URN: manualOrg.urn,
      Town: manualOrg.town,
      Phase: manualOrg.phase,
      Gender: manualOrg.gender,
      Street: manualOrg.street,
      AddressLine1: manualOrg.address,
      TelephoneNumber: manualOrg.phone,
      latitude: manualOrg.latitude ? parseFloat(manualOrg.latitude) : null,
      longitude: manualOrg.longitude ? parseFloat(manualOrg.longitude) : null,
      region: manualOrg.town,
      district: manualOrg.localAuthority,
      country: manualOrg.country,
      contactCount: (manualOrg._count?.contacts || 0) + ((manualOrg as any)._count?.importedContacts || 0),
      contacts: [
        ...manualOrg.contacts.map(c => ({
          id: c.id,
          fullName: c.fullName,
          email: c.email,
          phone: c.phone,
          jobTitle: c.jobTitle,
          department: c.department,
          gender: c.gender,
          isManual: true,
          createdAt: c.createdAt
        })),
        ...(manualOrg as any).importedContacts.map((c: any) => ({
          id: c.id,
          ...(c.payload as object),
          isManual: false,
          createdAt: c.createdAt
        }))
      ],
      isManual: true,
      createdAt: manualOrg.createdAt
    };
  }

  return null;
};



const updateImport = async (id: string, userId: string, data: any) => {
  const getField = (obj: any, ...keys: string[]) => {
    for (const key of keys) {
      if (obj[key] !== undefined) return obj[key];
    }
    return undefined;
  };

  const payload = data.payload;
  const latitude = getField(data, 'latitude');
  const longitude = getField(data, 'longitude');
  const region = getField(data, 'region');
  const district = getField(data, 'district');
  const country = getField(data, 'country');

  const knownKeys = ['payload', 'latitude', 'longitude', 'region', 'district', 'country', 'organizationDetails'];
  const otherFields: any = {};
  for (const key in data) {
    if (!knownKeys.includes(key)) {
      otherFields[key] = data[key];
    }
  }

  const result1 = await prisma.importedOrganization.updateMany({
    where: { id, userId },
    data: {
      ...(latitude && { latitude }),
      ...(longitude && { longitude }),
      ...(region && { region }),
      ...(district && { district }),
      ...(country && { country }),
      payload: {
        ...(payload || {}),
        ...otherFields,
        ...(data.organizationDetails && { organizationDetails: data.organizationDetails })
      }
    }
  });

  const p = { ...(payload || {}), ...otherFields, ...(data.organizationDetails || {}) };
  const orgData = {
    ...(getField(p, 'name', 'OrganizationName') && { name: getField(p, 'name', 'OrganizationName') }),
    ...(getField(p, 'localAuthority', 'LocalAuthority') && { localAuthority: getField(p, 'localAuthority', 'LocalAuthority') }),
    ...(getField(p, 'postcode', 'Postcode') && { postcode: getField(p, 'postcode', 'Postcode') }),
    ...(getField(p, 'urn', 'URN') && { urn: String(getField(p, 'urn', 'URN')) }),
    ...(getField(p, 'town', 'Town') && { town: getField(p, 'town', 'Town') }),
    ...(getField(p, 'phase', 'Phase') && { phase: getField(p, 'phase', 'Phase') }),
    ...(getField(p, 'gender', 'Gender') && { gender: getField(p, 'gender', 'Gender') }),
    ...(getField(p, 'street', 'Street') && { street: getField(p, 'street', 'Street') }),
    ...(getField(p, 'address', 'AddressLine1') && { address: getField(p, 'address', 'AddressLine1') }),
    ...(getField(p, 'phone', 'TelephoneNumber') && { phone: String(getField(p, 'phone', 'TelephoneNumber')) }),
    ...(getField(p, 'latitude') && { latitude: String(getField(p, 'latitude')) }),
    ...(getField(p, 'longitude') && { longitude: String(getField(p, 'longitude')) }),
  };

  const result2 = await prisma.organization.updateMany({
    where: { id, userId },
    data: orgData
  });

  return { count: result1.count + result2.count };
};

const deleteImport = async (id: string, userId: string) => {
  const result1 = await prisma.importedOrganization.deleteMany({
    where: { id, userId },
  });

  const result2 = await prisma.organization.deleteMany({
    where: { id, userId },
  });

  return { count: result1.count + result2.count };
};

const deleteAllImports = async (userId: string) => {
  const result = await prisma.importedOrganization.deleteMany({
    where: { userId },
  });
  return result;
};

const getFilters = async (userId: string) => {
  const importedOrgs = await prisma.importedOrganization.findMany({
    where: { userId },
    select: { payload: true, region: true }
  });

  const manualOrgs = await prisma.organization.findMany({
    where: { userId },
    select: { localAuthority: true, town: true }
  });

  const phases = new Set<string>();
  const regions = new Set<string>();
  const authorities = new Set<string>();

  importedOrgs.forEach(org => {
    const p = org.payload as any;
    if (p?.Phase) phases.add(p.Phase);
    if (org.region) regions.add(org.region);
    if (p?.LocalAuthority) authorities.add(p.LocalAuthority);
  });

  manualOrgs.forEach(org => {
    if (org.localAuthority) authorities.add(org.localAuthority);
    if (org.town) regions.add(org.town);
  });

  return {
    phases: Array.from(phases).sort(),
    regions: Array.from(regions).sort(),
    authorities: Array.from(authorities).sort()
  };
};

export const importOrganizationServices = {
  processExcelFiles,
  getAllImports,
  getFilters,
  getImportById,
  updateImport,
  deleteImport,
  deleteAllImports,
};
