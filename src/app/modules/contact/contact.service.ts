import { prisma } from "../../db_connection";

const createContact = async (userId: string, payload: any) => {
  const {
    FullName,
    WorkEmail,
    WorkPhone,
    JobTitle,
    Department,
    Gender,
    ...rest
  } = payload;

  const data = {
    ...rest,
    userId,
    fullName: FullName || payload.fullName,
    email: WorkEmail || payload.email,
    phone: WorkPhone || payload.phone,
    jobTitle: JobTitle || payload.jobTitle,
    department: Department || payload.department,
    gender: Gender || payload.gender,
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
    organizationDetails: c.organization ? {
      OrganizationName: c.organization.name,
      LocalAuthority: c.organization.localAuthority,
      Postcode: c.organization.postcode,
      URN: c.organization.urn,
      Town: c.organization.town,
      Phase: c.organization.phase,
      Gender: c.organization.gender,
      Street: c.organization.street,
      AddressLine1: c.organization.address,
      TelephoneNumber: c.organization.phone,
      latitude: c.organization.latitude,
      longitude: c.organization.longitude,
      region: c.organization.town,
      district: c.organization.localAuthority,
      country: c.organization.country,
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
    organizationDetails: result.organization ? {
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
      latitude: result.organization.latitude,
      longitude: result.organization.longitude,
      region: result.organization.town,
      district: result.organization.localAuthority,
      country: result.organization.country,
    } : null,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
  };
};

const updateContact = async (id: string, userId: string, payload: any) => {
  const {
    FullName,
    WorkEmail,
    WorkPhone,
    JobTitle,
    Department,
    Gender,
    ...rest
  } = payload;

  const data = {
    ...rest,
    ...(FullName && { fullName: FullName }),
    ...(WorkEmail && { email: WorkEmail }),
    ...(WorkPhone && { phone: WorkPhone }),
    ...(JobTitle && { jobTitle: JobTitle }),
    ...(Department && { department: Department }),
    ...(Gender && { gender: Gender }),
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
