import * as XLSX from 'xlsx';
import fs from 'fs/promises';
import PQueue from 'p-queue';
import { prisma } from '../../db_connection';
import { activityLogServices } from '../activityLog/activityLog.service';
import { getDistance } from '../../utils/geocoder';

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

            let successCount = 0;
            if (Array.isArray(jsonData)) {
              for (const item of jsonData) {
                try {
                  const orgName = item.OrganizationName || null;
                  const localAuth = item.LocalAuthority || null;

                  const key = `${normalizeName(orgName)}|${(localAuth || '').toLowerCase().trim()}`;
                  const orgId = orgLookup.get(key) || null;

                  const gender = item.Gender || item.gender;
                  
                  await prisma.importContact.create({
                    data: {
                      userId,
                      payload: item as any,
                      organizationName: normalizeName(orgName),
                      localAuthority: (localAuth || '').trim(),
                      gender: gender ? String(gender) : null,
                      importedOrganizationId: orgId
                    }
                  });
                  successCount++;
                } catch (err: any) {
                  console.error(`[Import] Failed to save contact: ${item.FullName || 'Unknown'}`, err.message);
                }
              }
            }

            await fs.unlink(file.path);
            return {
              fileName: file.originalname,
              rowCount: successCount,
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

const getArrayParam = (param1: any, param2: any) => {
  let val = param1 || param2;
  if (!val) return undefined;
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') return val.split(',').map(v => v.trim()).filter(Boolean);
  return [val];
};

const getAllImports = async (userId: string, query: any) => {
  const { searchTerm, page = 1, limit = 10, radius, generatedCvId } = query;

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const filterAuthorities = getArrayParam(query.authorities, query.localAuthority);
  const filterGenders = getArrayParam(query.genders, query.gender);
  const filterRegions = getArrayParam(query.regions, query.region);
  const filterTowns = getArrayParam(query.towns, query.town);
  const filterPhases = getArrayParam(query.phases, query.phase);
  const filterJobs = getArrayParam(query.jobs, query.job);
  const filterCountries = getArrayParam(query.countries, query.country);

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

  if (filterAuthorities && filterAuthorities.length > 0) {
    andConditions.push({
      OR: filterAuthorities.map((auth: string) => ({
        localAuthority: { contains: auth, mode: 'insensitive' }
      }))
    });
  }

  if (filterGenders && filterGenders.length > 0) {
    andConditions.push({
      OR: filterGenders.map((g: string) => ({
        OR: [
          { gender: { contains: g, mode: 'insensitive' } },
          { importedOrganization: { payload: { path: ['Gender'], string_contains: g } } },
          { importedOrganization: { payload: { path: ['gender'], string_contains: g } } },
          { payload: { path: ['Gender'], string_contains: g } },
          { payload: { path: ['gender'], string_contains: g } }
        ]
      }))
    });
  }

  if (filterPhases && filterPhases.length > 0) {
    andConditions.push({
      OR: filterPhases.map((p: string) => ({
        OR: [
          { importedOrganization: { payload: { path: ['Phase'], string_contains: p } } },
          { importedOrganization: { payload: { path: ['phase'], string_contains: p } } },
          { payload: { path: ['Phase'], string_contains: p } },
          { payload: { path: ['phase'], string_contains: p } }
        ]
      }))
    });
  }

  if (filterRegions && filterRegions.length > 0) {
    andConditions.push({
      OR: filterRegions.map((r: string) => ({
        importedOrganization: {
          region: { contains: r, mode: 'insensitive' },
        }
      }))
    });
  }

  if (filterCountries && filterCountries.length > 0) {
    andConditions.push({
      OR: filterCountries.map((c: string) => ({
        importedOrganization: {
          country: { contains: c, mode: 'insensitive' },
        }
      }))
    });
  }

  if (filterTowns && filterTowns.length > 0) {
    andConditions.push({
      OR: filterTowns.map((t: string) => ({
        OR: [
          { importedOrganization: { payload: { path: ['Town'], string_contains: t } } },
          { importedOrganization: { payload: { path: ['town'], string_contains: t } } },
          { payload: { path: ['Town'], string_contains: t } },
          { payload: { path: ['town'], string_contains: t } }
        ]
      }))
    });
  }

  if (filterJobs && filterJobs.length > 0) {
    andConditions.push({
      OR: filterJobs.map((j: string) => ({
        OR: [
          { payload: { path: ['JobTitle'], string_contains: j } },
          { payload: { path: ['jobTitle'], string_contains: j } },
          { payload: { path: ['Job Title'], string_contains: j } },
          { payload: { path: ['job title'], string_contains: j } }
        ]
      }))
    });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  const isRadiusFilter = radius && generatedCvId;

  const result = await prisma.importContact.findMany({
    where,
    include: {
      importedOrganization: true,
      organization: true
    },
    orderBy: { createdAt: 'desc' },
    // Pagination will be handled in memory for merging
  });

  // Fetch manual contacts with filters
  const manualWhere: any = { userId };
  const manualAndConditions: any[] = [];

  if (searchTerm) {
    manualAndConditions.push({
      fullName: { contains: searchTerm, mode: 'insensitive' }
    });
  }

  if (filterAuthorities && filterAuthorities.length > 0) {
    manualAndConditions.push({
      OR: filterAuthorities.map((auth: string) => ({
        organization: { localAuthority: { contains: auth, mode: 'insensitive' } }
      }))
    });
  }

  if (filterGenders && filterGenders.length > 0) {
    manualAndConditions.push({
      OR: filterGenders.map((g: string) => ({
        OR: [
          { gender: { contains: g, mode: 'insensitive' } },
          { organization: { gender: { contains: g, mode: 'insensitive' } } }
        ]
      }))
    });
  }

  if (filterPhases && filterPhases.length > 0) {
    manualAndConditions.push({
      OR: filterPhases.map((p: string) => ({
        organization: { phase: { contains: p, mode: 'insensitive' } }
      }))
    });
  }

  if (filterRegions && filterRegions.length > 0) {
    manualAndConditions.push({
      OR: filterRegions.map((r: string) => ({
        organization: { town: { contains: r, mode: 'insensitive' } }
      }))
    });
  }

  if (filterCountries && filterCountries.length > 0) {
    manualAndConditions.push({
      OR: filterCountries.map((c: string) => ({
        organization: { country: { contains: c, mode: 'insensitive' } }
      }))
    });
  }

  if (filterTowns && filterTowns.length > 0) {
    manualAndConditions.push({
      OR: filterTowns.map((t: string) => ({
        organization: { town: { contains: t, mode: 'insensitive' } }
      }))
    });
  }

  if (filterJobs && filterJobs.length > 0) {
    manualAndConditions.push({
      OR: filterJobs.map((j: string) => ({
        jobTitle: { contains: j, mode: 'insensitive' }
      }))
    });
  }

  if (manualAndConditions.length > 0) {
    manualWhere.AND = manualAndConditions;
  }

  const manualContacts = await prisma.contact.findMany({
    where: manualWhere,
    include: {
      organization: true,
      importedOrganization: true
    }
  });

  // Map manual contacts to match imported format
  const mappedManual = manualContacts.map(c => ({
    id: c.id,
    OrganizationName: c.organization?.name,
    LocalAuthority: c.organization?.localAuthority,
    FullName: c.fullName,
    WorkEmail: c.email,
    WorkPhone: c.phone,
    JobTitle: c.jobTitle,
    Department: c.department,
    isManual: true,
    distance: null, // Distance filtering not implemented for manual yet
    organizationDetails: (c.organization || c.importedOrganization) ? {
      OrganizationName: c.organization?.name || (c.importedOrganization?.payload as any)?.OrganizationName,
      LocalAuthority: c.organization?.localAuthority || (c.importedOrganization?.payload as any)?.LocalAuthority,
      Postcode: c.organization?.postcode || (c.importedOrganization?.payload as any)?.Postcode,
      URN: c.organization?.urn || (c.importedOrganization?.payload as any)?.URN,
      Town: c.organization?.town || (c.importedOrganization?.payload as any)?.Town,
      Phase: c.organization?.phase || (c.importedOrganization?.payload as any)?.Phase,
      Gender: c.organization?.gender || (c.importedOrganization?.payload as any)?.Gender,
      Street: c.organization?.street || (c.importedOrganization?.payload as any)?.Street,
      AddressLine1: c.organization?.address || (c.importedOrganization?.payload as any)?.AddressLine1,
      TelephoneNumber: c.organization?.phone || (c.importedOrganization?.payload as any)?.TelephoneNumber,
      latitude: c.organization?.latitude ? parseFloat(c.organization?.latitude) : (c.importedOrganization?.latitude || null),
      longitude: c.organization?.longitude ? parseFloat(c.organization?.longitude) : (c.importedOrganization?.longitude || null),
      region: c.organization?.town || c.importedOrganization?.region,
      district: c.organization?.localAuthority || c.importedOrganization?.district,
      country: c.organization?.country || c.importedOrganization?.country,
    } : null,
    createdAt: c.createdAt
  }));

  // Map imported contacts
  let mappedImported = result.map(item => {
    const payload = item.payload as object;
    const org = item.importedOrganization;
    return {
      id: item.id,
      ...payload,
      distance: (item as any).distance ? parseFloat((item as any).distance.toFixed(2)) : null,
      importedOrganizationId: item.importedOrganizationId,
      Gender: item.gender,
      organizationDetails: (org || item.organization) ? {
        ...(org?.payload as object || {}),
        ...(item.organization ? {
          OrganizationName: item.organization.name,
          LocalAuthority: item.organization.localAuthority,
          Postcode: item.organization.postcode,
          URN: item.organization.urn,
          Town: item.organization.town,
          Phase: item.organization.phase,
          Gender: item.organization.gender,
          Street: item.organization.street,
          AddressLine1: item.organization.address,
          TelephoneNumber: item.organization.phone,
        } : {}),
        latitude: org?.latitude || (item.organization?.latitude ? parseFloat(item.organization.latitude) : null),
        longitude: org?.longitude || (item.organization?.longitude ? parseFloat(item.organization.longitude) : null),
        region: org?.region || item.organization?.town,
        district: org?.district || item.organization?.localAuthority,
        country: org?.country || item.organization?.country,
      } : null,
      isManual: false,
      createdAt: item.createdAt
    } as any;
  });

  if (isRadiusFilter) {
    const cv = await prisma.generatedCV.findUnique({
      where: { id: generatedCvId },
      include: {
        qualityCheck: { include: { candidate: true } }
      }
    });

    if (cv?.qualityCheck?.candidate?.latitude && cv?.qualityCheck?.candidate?.longitude) {
      const cLat = cv.qualityCheck.candidate.latitude;
      const cLon = cv.qualityCheck.candidate.longitude;
      const r = Number(radius);

      mappedImported = mappedImported.filter(item => {
        const org = item.organizationDetails;
        if (org?.latitude && org?.longitude) {
          const dist = getDistance(cLat, cLon, org.latitude, org.longitude);
          item.distance = dist;
          return dist <= r;
        }
        return false;
      });
    }
  }

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
  const result = await prisma.importContact.findFirst({
    where: { id, userId },
    include: {
      importedOrganization: true,
      organization: true
    }
  });

  if (result) {
    const payload = result.payload as object;
    return {
      id: result.id,
      ...payload,
      importedOrganization: (result.importedOrganization || result.organization) ? {
        ...(result.importedOrganization?.payload as object || {}),
        ...(result.organization ? {
           OrganizationName: result.organization.name,
           LocalAuthority: result.organization.localAuthority,
           Postcode: result.organization.postcode,
           URN: result.organization.urn,
           Town: result.organization.town,
           Phase: result.organization.phase,
           Gender: result.organization.gender,
           Street: result.organization.street,
           AddressLine1: result.organization.address,
           TelephoneNumber: result.organization.phone,
        } : {}),
        latitude: result.importedOrganization?.latitude || (result.organization?.latitude ? parseFloat(result.organization.latitude) : null),
        longitude: result.importedOrganization?.longitude || (result.organization?.longitude ? parseFloat(result.organization.longitude) : null),
        region: result.importedOrganization?.region || result.organization?.town,
        district: result.importedOrganization?.district || result.organization?.localAuthority,
        country: result.importedOrganization?.country || result.organization?.country,
      } : null,
      isManual: false,
      Gender: result.gender,
      createdAt: result.createdAt
    };
  }

  // If not found in imported, check manual contacts
  const manualContact = await prisma.contact.findFirst({
    where: { id, userId },
    include: {
      organization: true,
      importedOrganization: true
    }
  });

  if (manualContact) {
    return {
      id: manualContact.id,
      FullName: manualContact.fullName,
      WorkEmail: manualContact.email,
      WorkPhone: manualContact.phone,
      JobTitle: manualContact.jobTitle,
      Department: manualContact.department,
      Gender: manualContact.gender,
      isManual: true,
      organizationDetails: (manualContact.organization || manualContact.importedOrganization) ? {
        OrganizationName: manualContact.organization?.name || (manualContact.importedOrganization?.payload as any)?.OrganizationName,
        LocalAuthority: manualContact.organization?.localAuthority || (manualContact.importedOrganization?.payload as any)?.LocalAuthority,
        Postcode: manualContact.organization?.postcode || (manualContact.importedOrganization?.payload as any)?.Postcode,
        URN: manualContact.organization?.urn || (manualContact.importedOrganization?.payload as any)?.URN,
        Town: manualContact.organization?.town || (manualContact.importedOrganization?.payload as any)?.Town,
        Phase: manualContact.organization?.phase || (manualContact.importedOrganization?.payload as any)?.Phase,
        Gender: manualContact.organization?.gender || (manualContact.importedOrganization?.payload as any)?.Gender,
        Street: manualContact.organization?.street || (manualContact.importedOrganization?.payload as any)?.Street,
        AddressLine1: manualContact.organization?.address || (manualContact.importedOrganization?.payload as any)?.AddressLine1,
        TelephoneNumber: manualContact.organization?.phone || (manualContact.importedOrganization?.payload as any)?.TelephoneNumber,
        latitude: manualContact.organization?.latitude ? parseFloat(manualContact.organization.latitude) : (manualContact.importedOrganization?.latitude || null),
        longitude: manualContact.organization?.longitude ? parseFloat(manualContact.organization.longitude) : (manualContact.importedOrganization?.longitude || null),
        region: manualContact.organization?.town || manualContact.importedOrganization?.region,
        district: manualContact.organization?.localAuthority || manualContact.importedOrganization?.district,
        country: manualContact.organization?.country || manualContact.importedOrganization?.country,
      } : null,
      createdAt: manualContact.createdAt
    };
  }

  return null;
};

const deleteImport = async (id: string, userId: string) => {
  const result1 = await prisma.importContact.deleteMany({
    where: { id, userId },
  });

  const result2 = await prisma.contact.deleteMany({
    where: { id, userId },
  });

  return { count: result1.count + result2.count };
};

const deleteAllImports = async (userId: string) => {
  const result = await prisma.importContact.deleteMany({
    where: { userId },
  });
  return result;
};

const updateImport = async (id: string, userId: string, data: any) => {
  // Case-insensitive extraction
  const getField = (obj: any, ...keys: string[]) => {
    for (const key of keys) {
      if (obj[key] !== undefined) return obj[key];
    }
    return undefined;
  };

  const payload = data.payload;
  const organizationName = getField(data, 'organizationName', 'OrganizationName');
  const localAuthority = getField(data, 'localAuthority', 'LocalAuthority');
  const gender = getField(data, 'gender', 'Gender');
  const importedOrganizationId = getField(data, 'importedOrganizationId', 'organizationId'); // in imports we often use organizationId for the linked one
  const organizationDetails = data.organizationDetails;

  // Filter out the extracted fields to get "otherFields"
  const knownKeys = ['payload', 'organizationName', 'OrganizationName', 'localAuthority', 'LocalAuthority', 'gender', 'Gender', 'importedOrganizationId', 'organizationId', 'organizationDetails'];
  const otherFields: any = {};
  for (const key in data) {
    if (!knownKeys.includes(key)) {
      otherFields[key] = data[key];
    }
  }

  const finalGender = gender;

  // 1. Update Linked Organization if organizationDetails is provided
  if (organizationDetails) {
    // Find the contact to see which organization is linked
    const contact = await prisma.contact.findFirst({
      where: { id, userId },
      select: { organizationId: true, importedOrganizationId: true }
    });

    const importContact = await prisma.importContact.findFirst({
      where: { id, userId },
      select: { importedOrganizationId: true, organizationId: true }
    });

    const manualOrgId = contact?.organizationId || importContact?.organizationId;
    const importedOrgId = contact?.importedOrganizationId || importContact?.importedOrganizationId;

    if (manualOrgId) {
      const orgData = {
        ...(organizationDetails.OrganizationName && { name: organizationDetails.OrganizationName }),
        ...(organizationDetails.LocalAuthority && { localAuthority: organizationDetails.LocalAuthority }),
        ...(organizationDetails.Postcode && { postcode: organizationDetails.Postcode }),
        ...(organizationDetails.URN && { urn: String(organizationDetails.URN) }),
        ...(organizationDetails.Town && { town: organizationDetails.Town }),
        ...(organizationDetails.Phase && { phase: organizationDetails.Phase }),
        ...(organizationDetails.Gender && { gender: organizationDetails.Gender }),
        ...(organizationDetails.Street && { street: organizationDetails.Street }),
        ...(organizationDetails.AddressLine1 && { address: organizationDetails.AddressLine1 }),
        ...(organizationDetails.TelephoneNumber && { phone: String(organizationDetails.TelephoneNumber) }),
        ...(organizationDetails.latitude && { latitude: String(organizationDetails.latitude) }),
        ...(organizationDetails.longitude && { longitude: String(organizationDetails.longitude) }),
        ...(organizationDetails.country && { country: organizationDetails.country }),
      };
      await prisma.organization.updateMany({
        where: { id: manualOrgId, userId },
        data: orgData
      });
    }

    if (importedOrgId) {
      const importedOrg = await prisma.importedOrganization.findUnique({
        where: { id: importedOrgId }
      });
      if (importedOrg) {
        await prisma.importedOrganization.update({
          where: { id: importedOrgId },
          data: {
            payload: {
              ...(importedOrg.payload as object || {}),
              ...organizationDetails
            },
            ...(organizationDetails.latitude && { latitude: organizationDetails.latitude }),
            ...(organizationDetails.longitude && { longitude: organizationDetails.longitude }),
          }
        });
      }
    }
  }

  // 2. Update ImportContact
  const result1 = await prisma.importContact.updateMany({
    where: { id, userId },
    data: {
      ...(organizationName && { organizationName }),
      ...(localAuthority && { localAuthority }),
      ...(finalGender && { gender: finalGender }),
      ...(importedOrganizationId && { importedOrganizationId }),
      payload: {
        ...(payload || {}),
        ...otherFields,
        ...(organizationDetails && { organizationDetails })
      }
    }
  });

  // 3. Update manual Contact
  const p = { ...(payload || {}), ...otherFields };
  const fullName = getField(p, 'fullName', 'FullName');
  const email = getField(p, 'email', 'WorkEmail');
  const phone = getField(p, 'phone', 'WorkPhone');
  const jobTitle = getField(p, 'jobTitle', 'JobTitle');
  const department = getField(p, 'department', 'Department');
  const manualGender = getField(p, 'gender', 'Gender');
  const organizationId = getField(p, 'organizationId');

  let isManualOrg = false;
  if (organizationId) {
    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (org) isManualOrg = true;
  }

  const contactData = {
    ...otherFields,
    ...(fullName && { fullName }),
    ...(email && { email }),
    ...(phone && { phone }),
    ...(jobTitle && { jobTitle }),
    ...(department && { department }),
    ...(manualGender && { gender: manualGender }),
    ...(organizationId && (isManualOrg 
      ? { organizationId, importedOrganizationId: null } 
      : { organizationId: null, importedOrganizationId: organizationId })),
  };

  const result2 = await prisma.contact.updateMany({
    where: { id, userId },
    data: contactData
  });

  return { count: result1.count + result2.count };
};

const getFilters = async (userId: string) => {
  const importedContacts = await prisma.importContact.findMany({
    where: { userId },
    select: { 
      payload: true, 
      localAuthority: true, 
      importedOrganization: { 
        select: { 
          region: true, 
          country: true,
          payload: true 
        } 
      } 
    }
  });

  const manualContacts = await prisma.contact.findMany({
    where: { userId },
    select: { 
      jobTitle: true, 
      gender: true, 
      organization: { 
        select: { 
          localAuthority: true,
          phase: true,
          town: true,
          gender: true,
          country: true
        } 
      } 
    }
  });

  const jobs = new Set<string>();
  const phases = new Set<string>();
  const regions = new Set<string>();
  const genders = new Set<string>();
  const authorities = new Set<string>();
  const towns = new Set<string>();
  const countries = new Set<string>();

  importedContacts.forEach(c => {
    const p = c.payload as any;
    const orgP = c.importedOrganization?.payload as any;

    if (p?.JobTitle) jobs.add(p.JobTitle);
    
    const phase = p?.Phase || orgP?.Phase;
    if (phase) phases.add(phase);
    
    const gender = p?.Gender || orgP?.Gender;
    if (gender) genders.add(gender);
    
    const authority = c.localAuthority || p?.LocalAuthority || orgP?.LocalAuthority;
    if (authority) authorities.add(authority);
    
    const region = c.importedOrganization?.region || orgP?.region;
    if (region) regions.add(region);

    const town = orgP?.Town || orgP?.town;
    if (town) towns.add(town);

    const country = c.importedOrganization?.country || orgP?.Country || orgP?.country;
    if (country) countries.add(country);
  });

  manualContacts.forEach(c => {
    if (c.jobTitle) jobs.add(c.jobTitle);
    
    const gender = c.gender || c.organization?.gender;
    if (gender) genders.add(gender);

    const phase = c.organization?.phase;
    if (phase) phases.add(phase);

    const authority = c.organization?.localAuthority;
    if (authority) authorities.add(authority);

    const region = c.organization?.town; // In some models town is used as region
    if (region) regions.add(region);

    const town = c.organization?.town;
    if (town) towns.add(town);

    const country = c.organization?.country;
    if (country) countries.add(country);
  });

  return {
    jobs: Array.from(jobs).sort(),
    phases: Array.from(phases).sort(),
    regions: Array.from(regions).sort(),
    genders: Array.from(genders).sort(),
    authorities: Array.from(authorities).sort(),
    towns: Array.from(towns).sort(),
    countries: Array.from(countries).sort()
  };
};

export const importContactServices = {
  processExcelFiles,
  getAllImports,
  getFilters,
  getImportById,
  updateImport,
  deleteImport,
  deleteAllImports,
};
