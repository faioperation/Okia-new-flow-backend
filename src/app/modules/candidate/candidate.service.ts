import { prisma } from "../../db_connection";
import { activityLogServices } from "../activityLog/activityLog.service";
import { getCoordinates } from "../../utils/geocoder";

const createCandidate = async (payload: any, userId: string) => {
  // Geocode address if present
  if (payload.address) {
    const coords = await getCoordinates(payload.address);
    if (coords) {
      payload.latitude = coords.lat;
      payload.longitude = coords.lng;
    }
  }

  const result = await prisma.candidate.create({
    data: payload,
    include: {
      educations: true,
      employmentHistories: true,
      skills: true,
      cvFiles: true,
    },
  });

  // Log the activity
  if (result) {
    await activityLogServices.createLog(
      userId,
      "CANDIDATE_UPLOAD",
      `Created candidate: ${result.candidateName}`,
      { candidateId: result.id }
    );
  }

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
  // Geocode address if updated
  if (payload.address) {
    const coords = await getCoordinates(payload.address);
    if (coords) {
      payload.latitude = coords.lat;
      payload.longitude = coords.lng;
    }
  }

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
