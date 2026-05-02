import { prisma } from "../../db_connection";

const createOrganization = async (userId: string, payload: any) => {
  const {
    OrganizationName,
    LocalAuthority,
    Postcode,
    URN,
    Town,
    Phase,
    Gender,
    Street,
    AddressLine1,
    TelephoneNumber,
    latitude,
    longitude,
    ...rest
  } = payload;

  const data = {
    ...rest,
    userId,
    name: OrganizationName || payload.name,
    localAuthority: LocalAuthority || payload.localAuthority,
    postcode: Postcode || payload.postcode,
    urn: URN || payload.urn ? String(URN || payload.urn) : undefined,
    town: Town || payload.town,
    phase: Phase || payload.phase,
    gender: Gender || payload.gender,
    street: Street || payload.street,
    address: AddressLine1 || payload.address,
    phone: TelephoneNumber ? String(TelephoneNumber) : payload.phone,
    latitude: latitude ? String(latitude) : payload.latitude ? String(payload.latitude) : undefined,
    longitude: longitude ? String(longitude) : payload.longitude ? String(payload.longitude) : undefined,
  };

  const result = await prisma.organization.create({
    data,
  });
  return result;
};

const getAllOrganizations = async (userId: string) => {
  const result = await prisma.organization.findMany({
    where: { userId },
    include: {
      _count: {
        select: { contacts: true },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return result.map(org => ({
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
    latitude: org.latitude,
    longitude: org.longitude,
    region: org.town,
    district: org.localAuthority,
    country: org.country,
    contactCount: org._count?.contacts || 0,
    isManual: true,
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
  }));
};

const getSingleOrganization = async (id: string, userId: string) => {
  const result = await prisma.organization.findFirst({
    where: { id, userId },
    include: {
      contacts: true,
      _count: {
        select: { contacts: true }
      }
    },
  });

  if (!result) return null;

  return {
    id: result.id,
    OrganizationName: result.name,
    LocalAuthority: result.localAuthority,
    Postcode: result.postcode,
    URN: result.urn,
    Town: result.town,
    Phase: result.phase,
    Gender: result.gender,
    Street: result.street,
    AddressLine1: result.address,
    TelephoneNumber: result.phone,
    latitude: result.latitude,
    longitude: result.longitude,
    region: result.name,
    district: result.localAuthority,
    country: result.country,
    contactCount: result._count?.contacts || 0,
    isManual: true,
    contacts: result.contacts,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
  };
};

const updateOrganization = async (id: string, userId: string, payload: any) => {
  const {
    OrganizationName,
    LocalAuthority,
    Postcode,
    URN,
    Town,
    Phase,
    Gender,
    Street,
    AddressLine1,
    TelephoneNumber,
    latitude,
    longitude,
    ...rest
  } = payload;

  const data = {
    ...rest,
    ...(OrganizationName && { name: OrganizationName }),
    ...(LocalAuthority && { localAuthority: LocalAuthority }),
    ...(Postcode && { postcode: Postcode }),
    ...(URN && { urn: String(URN) }),
    ...(Town && { town: Town }),
    ...(Phase && { phase: Phase }),
    ...(Gender && { gender: Gender }),
    ...(Street && { street: Street }),
    ...(AddressLine1 && { address: AddressLine1 }),
    ...(TelephoneNumber && { phone: String(TelephoneNumber) }),
    ...(latitude && { latitude: String(latitude) }),
    ...(longitude && { longitude: String(longitude) }),
  };

  const result = await prisma.organization.updateMany({
    where: { id, userId },
    data,
  });
  return result;
};

const deleteOrganization = async (id: string, userId: string) => {
  const result = await prisma.organization.deleteMany({
    where: { id, userId },
  });
  return result;
};

const deleteAllOrganizations = async (userId: string) => {
  const result = await prisma.organization.deleteMany({
    where: { userId },
  });
  return result;
};

export const organizationServices = {
  createOrganization,
  getAllOrganizations,
  getSingleOrganization,
  updateOrganization,
  deleteOrganization,
  deleteAllOrganizations,
};
