import { prisma } from "../../db_connection";

const createOrganization = async (userId: string, payload: any) => {
  const result = await prisma.organization.create({
    data: { ...payload, userId },
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
  return result;
};

const getSingleOrganization = async (id: string, userId: string) => {
  const result = await prisma.organization.findFirst({
    where: { id, userId },
    include: {
      contacts: true,
    },
  });
  return result;
};

const updateOrganization = async (id: string, userId: string, payload: any) => {
  const result = await prisma.organization.updateMany({
    where: { id, userId },
    data: payload,
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
