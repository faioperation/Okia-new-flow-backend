import { prisma } from "../../db_connection";

const getField = (obj: any, ...keys: string[]) => {
  for (const key of keys) {
    if (obj[key] !== undefined) return obj[key];
  }
  return undefined;
};

const createContact = async (userId: string, payload: any) => {
  const organizationId = getField(payload, 'organizationId');
  const fullName = getField(payload, 'fullName', 'FullName');
  const email = getField(payload, 'email', 'WorkEmail');
  const phone = getField(payload, 'phone', 'WorkPhone');
  const jobTitle = getField(payload, 'jobTitle', 'JobTitle');
  const department = getField(payload, 'department', 'Department');
  const gender = getField(payload, 'gender', 'Gender');

  const knownKeys = ['organizationId', 'fullName', 'FullName', 'email', 'WorkEmail', 'phone', 'WorkPhone', 'jobTitle', 'JobTitle', 'department', 'Department', 'gender', 'Gender'];
  const rest: any = {};
  for (const key in payload) {
    if (!knownKeys.includes(key)) {
      rest[key] = payload[key];
    }
  }

  // Check if organizationId belongs to manual Organization or ImportedOrganization
  let isManual = false;
  if (organizationId) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (org) isManual = true;
  }

  const data = {
    ...rest,
    user: { connect: { id: userId } },
    fullName,
    email,
    phone,
    jobTitle,
    department,
    gender,
    ...(organizationId && (isManual 
      ? { organization: { connect: { id: organizationId } } } 
      : { importedOrganization: { connect: { id: organizationId } } })),
  };

  const result = await prisma.contact.create({
    data,
  });
  return result;
};

const getAllContacts = async (userId: string) => {
  const result = await prisma.contact.findMany({
    where: { userId },
    include: {
      organization: true,
      importedOrganization: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return result.map(c => ({
    id: c.id,
    FullName: c.fullName,
    WorkEmail: c.email,
    WorkPhone: c.phone,
    JobTitle: c.jobTitle,
    Department: c.department,
    Gender: c.gender,
    isManual: true,
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
      latitude: c.organization?.latitude || c.importedOrganization?.latitude,
      longitude: c.organization?.longitude || c.importedOrganization?.longitude,
      region: c.organization?.town || c.importedOrganization?.region,
      district: c.organization?.localAuthority || c.importedOrganization?.district,
      country: c.organization?.country || c.importedOrganization?.country,
    } : null,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));
};

const getSingleContact = async (id: string, userId: string) => {
  const result = await prisma.contact.findFirst({
    where: { id, userId },
    include: {
      organization: true,
      importedOrganization: true,
    },
  });

  if (!result) return null;

  return {
    id: result.id,
    FullName: result.fullName,
    WorkEmail: result.email,
    WorkPhone: result.phone,
    JobTitle: result.jobTitle,
    Department: result.department,
    Gender: result.gender,
    isManual: true,
    organizationDetails: (result.organization || result.importedOrganization) ? {
      OrganizationName: result.organization?.name || (result.importedOrganization?.payload as any)?.OrganizationName,
      LocalAuthority: result.organization?.localAuthority || (result.importedOrganization?.payload as any)?.LocalAuthority,
      Postcode: result.organization?.postcode || (result.importedOrganization?.payload as any)?.Postcode,
      URN: result.organization?.urn || (result.importedOrganization?.payload as any)?.URN,
      Town: result.organization?.town || (result.importedOrganization?.payload as any)?.Town,
      Phase: result.organization?.phase || (result.importedOrganization?.payload as any)?.Phase,
      Gender: result.organization?.gender || (result.importedOrganization?.payload as any)?.Gender,
      Street: result.organization?.street || (result.importedOrganization?.payload as any)?.Street,
      AddressLine1: result.organization?.address || (result.importedOrganization?.payload as any)?.AddressLine1,
      TelephoneNumber: result.organization?.phone || (result.importedOrganization?.payload as any)?.TelephoneNumber,
      latitude: result.organization?.latitude || result.importedOrganization?.latitude,
      longitude: result.organization?.longitude || result.importedOrganization?.longitude,
      region: result.organization?.town || result.importedOrganization?.region,
      district: result.organization?.localAuthority || result.importedOrganization?.district,
      country: result.organization?.country || result.importedOrganization?.country,
    } : null,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
  };
};

const updateContact = async (id: string, userId: string, payload: any) => {
  const organizationId = getField(payload, 'organizationId');
  const fullName = getField(payload, 'fullName', 'FullName');
  const email = getField(payload, 'email', 'WorkEmail');
  const phone = getField(payload, 'phone', 'WorkPhone');
  const jobTitle = getField(payload, 'jobTitle', 'JobTitle');
  const department = getField(payload, 'department', 'Department');
  const gender = getField(payload, 'gender', 'Gender');

  const knownKeys = ['organizationId', 'fullName', 'FullName', 'email', 'WorkEmail', 'phone', 'WorkPhone', 'jobTitle', 'JobTitle', 'department', 'Department', 'gender', 'Gender'];
  const rest: any = {};
  for (const key in payload) {
    if (!knownKeys.includes(key)) {
      rest[key] = payload[key];
    }
  }

  // Check if organizationId belongs to manual Organization or ImportedOrganization
  let isManual = false;
  if (organizationId) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (org) isManual = true;
  }

  const data = {
    ...rest,
    ...(fullName && { fullName }),
    ...(email && { email }),
    ...(phone && { phone }),
    ...(jobTitle && { jobTitle }),
    ...(department && { department }),
    ...(gender && { gender }),
    ...(organizationId && (isManual 
      ? { organizationId, importedOrganizationId: null } 
      : { organizationId: null, importedOrganizationId: organizationId })),
  };

  const result = await prisma.contact.updateMany({
    where: { id, userId },
    data,
  });
  return result;
};

const deleteContact = async (id: string, userId: string) => {
  const result = await prisma.contact.deleteMany({
    where: { id, userId },
  });
  return result;
};

const deleteAllContacts = async (userId: string) => {
  const result = await prisma.contact.deleteMany({
    where: { userId },
  });
  return result;
};

export const contactServices = {
  createContact,
  getAllContacts,
  getSingleContact,
  updateContact,
  deleteContact,
  deleteAllContacts,
};
