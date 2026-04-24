import { prisma } from "../../db_connection";

const createContact = async (payload: any) => {
  const result = await prisma.contact.create({
    data: payload,
  });
  return result;
};

const getAllContacts = async () => {
  const result = await prisma.contact.findMany({
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

const getSingleContact = async (id: string) => {
  const result = await prisma.contact.findUnique({
    where: { id },
    include: {
      organization: true,
    },
  });
  return result;
};

const updateContact = async (id: string, payload: any) => {
  const result = await prisma.contact.update({
    where: { id },
    data: payload,
  });
  return result;
};

const deleteContact = async (id: string) => {
  const result = await prisma.contact.delete({
    where: { id },
  });
  return result;
};

export const contactServices = {
  createContact,
  getAllContacts,
  getSingleContact,
  updateContact,
  deleteContact,
};
