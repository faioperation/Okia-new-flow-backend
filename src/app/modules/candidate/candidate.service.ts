import { prisma } from "../../db_connection";

const createCandidate = async (payload: any) => {
  const result = await prisma.candidate.create({
    data: payload,
    include: {
      educations: true,
      employmentHistories: true,
      skills: true,
      cvFiles: true,
    },
  });
  return result;
};

const getAllCandidates = async () => {
  const result = await prisma.candidate.findMany({
    include: {
      skills: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  return result;
};

const getSingleCandidate = async (id: string) => {
  const result = await prisma.candidate.findUnique({
    where: { id },
    include: {
      educations: true,
      employmentHistories: true,
      skills: true,
      cvFiles: true,
    },
  });
  return result;
};

const updateCandidate = async (id: string, payload: any) => {
  const result = await prisma.candidate.update({
    where: { id },
    data: payload,
    include: {
      educations: true,
      employmentHistories: true,
      skills: true,
      cvFiles: true,
    },
  });
  return result;
};

const deleteCandidate = async (id: string) => {
  const result = await prisma.candidate.delete({
    where: { id },
  });
  return result;
};

export const candidateServices = {
  createCandidate,
  getAllCandidates,
  getSingleCandidate,
  updateCandidate,
  deleteCandidate,
};
