import { prisma } from "../../db_connection";
import { activityLogServices } from "../activityLog/activityLog.service";
import { getCoordinates } from "../../utils/geocoder";

import { QueryBuilder } from "../../utils/QuaryBuilder";

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

const getAllCandidates = async (query: any) => {
  const queryBuilder = new QueryBuilder(query)
    .filter()
    .search(['candidateName', 'emailAddress', 'jobTitle'])
    .sort('createdAt')
    .paginate();

  const { select, ...otherQueryOptions } = queryBuilder.build();
  
  const result = await prisma.candidate.findMany({
    ...otherQueryOptions,
    include: {
      skills: true,
    },
  });

  const total = await prisma.candidate.count({
    where: otherQueryOptions.where
  });

  return {
    data: result,
    meta: queryBuilder.getMeta(total)
  };
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
  // Geocode address if updated OR if lat/long are missing and address is available
  let addressToGeocode = payload.address;

  if (!addressToGeocode) {
    const existingCandidate = await prisma.candidate.findUnique({
      where: { id },
      select: { address: true, latitude: true, longitude: true },
    });

    if (
      existingCandidate?.address &&
      (!existingCandidate.latitude || !existingCandidate.longitude)
    ) {
      addressToGeocode = existingCandidate.address;
    }
  }

  if (addressToGeocode) {
    const coords = await getCoordinates(addressToGeocode);
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
