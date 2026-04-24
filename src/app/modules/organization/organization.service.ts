import { prisma } from "../../db_connection";

const createOrganization = async (payload: any) => {
  const result = await prisma.organization.create({
    data: payload,
  });
  return result;
};

const getAllOrganizations = async () => {
  const result = await prisma.organization.findMany({
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

const getSingleOrganization = async (id: string) => {
  const result = await prisma.organization.findUnique({
    where: { id },
    include: {
      contacts: true,
    },
  });
  return result;
};

const updateOrganization = async (id: string, payload: any) => {
  const result = await prisma.organization.update({
    where: { id },
    data: payload,
  });
  return result;
};

const deleteOrganization = async (id: string) => {
  const result = await prisma.organization.delete({
    where: { id },
  });
  return result;
};

export const organizationServices = {
  createOrganization,
  getAllOrganizations,
  getSingleOrganization,
  updateOrganization,
  deleteOrganization,
};
