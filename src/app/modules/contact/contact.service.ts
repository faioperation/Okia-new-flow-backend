import { prisma } from "../../db_connection";

const createContact = async (userId: string, payload: any) => {
  const result = await prisma.contact.create({
    data: { ...payload, userId },
  });
  return result;
};

const getAllContacts = async (userId: string) => {
  const result = await prisma.contact.findMany({
    where: { userId },
    include: {
      organization: {
        select: {
          name: true,
          id: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  return result;
};

const getSingleContact = async (id: string, userId: string) => {
  const result = await prisma.contact.findFirst({
    where: { id, userId },
    include: {
      organization: true,
    },
  });
  return result;
};

const updateContact = async (id: string, userId: string, payload: any) => {
  const result = await prisma.contact.updateMany({
    where: { id, userId },
    data: payload,
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
