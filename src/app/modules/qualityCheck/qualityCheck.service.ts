import { prisma } from "../../db_connection";
import config from "../../config";
import ApiError from "../../errors/ApiError";
import httpStatus from "http-status";
import { QueryBuilder } from "../../utils/QuaryBuilder";
import { AvailabilityStatus } from "@prisma/client";
import { getCoordinates } from "../../utils/geocoder";

const processAiResponse = async (aiResponse: any) => {
  if (aiResponse.status !== 'success' || !Array.isArray(aiResponse.data)) {
    console.log(`[AI Response Process] Invalid or unsuccessful AI response format. Status: ${aiResponse.status}`);
    return [];
  }

  console.log(`[AI Response Process] Starting to save ${aiResponse.data.length} quality check results...`);

  const results = [];
  for (const item of aiResponse.data) {
    const { candidate_id, result, score } = item;

    // 1. Find the candidate to get its associated Batch ID
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidate_id },
      select: { batchId: true }
    });

    if (!candidate || !candidate.batchId) continue;

    const batchId = candidate.batchId;

    // 2. Prevent duplicate QualityCheck for this candidate
    const existingCheck = await prisma.qualityCheck.findUnique({
      where: { candidateId: candidate_id }
    });

    if (existingCheck) {
      // Ensure candidate aiCheck is true even if check existed
      await prisma.candidate.update({
        where: { id: candidate_id },
        data: { aiCheck: true }
      });

      results.push(existingCheck);
      continue;
    }

    const qualityPass = result === true || result === 'true';

    // 3. Create QualityCheck record (linked to candidate only)
    const qualityCheck = await prisma.qualityCheck.create({
      data: {
        candidateId: candidate_id,
        score: Number(score) || 0,
        qualityPass: qualityPass,
        fullResponse: item as any
      }
    });

    // 4. Update Candidate details (aiCheck and qualityStatus)
    await prisma.candidate.update({
      where: { id: candidate_id },
      data: {
        aiCheck: true,
        qualityStatus: qualityPass ? 'passed' : 'failed'
      }
    });

    // 5. Update the BulkUploadBatch status flag
    await prisma.bulkUploadBatch.update({
      where: { id: batchId },
      data: { aiCheck: true }
    });

    results.push(qualityCheck);
  }

  console.log(`[AI Response Process] Finished processing. Saved ${results.length} records.`);
  return results;
};


const runQualityCheckWithRetry = async (batchId: string, rules?: any, attempt = 1) => {
  if (attempt === 1) {
    console.log(`[AI Check] Delaying 1st attempt by 5 seconds...`);
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  console.log(`[AI Check] Attempt ${attempt} starting...`);

  try {
    // 1. Find candidates associated with this Batch
    const candidates = await prisma.candidate.findMany({
      where: { batchId: batchId },
      select: { id: true }
    });

    if (candidates.length === 0) {
      console.log(`[AI Check] No candidates found.`);
      return;
    }

    // Use the first candidate's ID for the AI call
    const targetCandidateId = candidates[0].id;

    console.log(`[AI Check] Calling AI API at ${config.AI_API_URL}/qualify for Candidate ID: ${targetCandidateId}...`);
    const response = await fetch(`${config.AI_API_URL}/qualify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Backend-Token': config.AI_HEADER_KEY
      },
      body: JSON.stringify({ 
        candidate_id: targetCandidateId,
        rules: rules,
        callback_url: `${config.BACKEND_URL}/api/quality-checks/callback`
      })
    });

    console.log(`[AI Check] API Response Status: ${response.status}`);

    if (response.ok) {
      const aiData = await response.json() as any;
      console.log(`[AI Check] AI Response Received:`, JSON.stringify(aiData, null, 2));

      const processed = await processAiResponse(aiData);
      console.log(`[AI Check] Processed ${processed.length} results.`);

      if (processed.length > 0) {
        console.log(`[AI Check] SUCCESS: AI data saved for candidates.`);
        return processed;
      } else {
        console.log(`[AI Check] WARNING: AI returned data, but none could be matched.`);
      }
    } else {
      const errorText = await response.text();
      console.error(`[AI Check] API Error (${response.status}): ${errorText}`);
    }


  } catch (error) {
    console.error(`[AI Check] Critical Error on attempt ${attempt}:`, error);
  }


  // Retry logic with specific intervals: 30s (initial), then 1m, then 1m 30s, then 1m thereafter
  const maxAttempts = 10;
  if (attempt < maxAttempts) {
    let delay = 60 * 1000; // Default 1 minute
    if (attempt === 2) delay = 90 * 1000; // 1 minute 30 seconds for the second retry

    console.log(`[AI Check] Data not ready. Retrying in ${delay / 1000}s... (Attempt ${attempt + 1}/${maxAttempts})`);

    await new Promise((resolve) => setTimeout(resolve, delay));
    return await runQualityCheckWithRetry(batchId, rules, attempt + 1);
  } else {
    console.error(`[AI Check] Failed to get AI data after ${maxAttempts} attempts.`);
  }
};


const syncAllPendingChecks = async () => {
  console.log(`[AI Sync] Starting every minute sync...`);
  try {
    const response = await fetch(`${config.AI_API_URL}/qualify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Backend-Token': config.AI_HEADER_KEY
      },
      body: JSON.stringify({
        callback_url: `${config.BACKEND_URL}/api/quality-checks/callback`
      })
    });


    if (response.ok) {
      const aiData = await response.json();
      console.log(`[AI Sync] Data received:`, JSON.stringify(aiData, null, 2));
      const processed = await processAiResponse(aiData);
      console.log(`[AI Sync] Processed ${processed.length} results.`);
    } else {
      console.error(`[AI Sync] API Error: ${response.status}`);
    }
  } catch (error) {
    console.error(`[AI Sync] Sync failed:`, error);
  }
};

const getAllQualityChecks = async (query: any, isPublic: boolean = false) => {
  // Boolean conversion for qualityPass
  if (query.qualityPass !== undefined) {
    query.qualityPass = query.qualityPass === 'true' || query.qualityPass === true;
  }

  const qualityCheckQuery = new QueryBuilder(query)
    .filter()
    .search(['fullResponse', { candidate: ['candidateName', 'emailAddress'] }])
    .sort('-createdAt')
    .paginate()
    .build();

  const whereCondition = {
    ...qualityCheckQuery.where,
    deletedAt: null
  };

  const result = await prisma.qualityCheck.findMany({
    where: whereCondition,
    orderBy: qualityCheckQuery.orderBy,
    skip: qualityCheckQuery.skip,
    take: qualityCheckQuery.take,
    include: { candidate: true, cv: !isPublic },
  });

  const total = await prisma.qualityCheck.count({
    where: whereCondition
  });

  return {
    data: result,
    meta: {
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 10,
      total,
      totalPage: Math.ceil(total / (Number(query.limit) || 10)),
    }
  };
};

const getQualityCheckById = async (id: string, isPublic: boolean = false) => {
  const result = await prisma.qualityCheck.findUnique({
    where: { id, deletedAt: null },
    include: { candidate: true, cv: !isPublic },
  });
  return result;
};


const updateQualityCheck = async (id: string, payload: any) => {
  const result = await prisma.$transaction(async (tx) => {
    const { candidate, ...restPayload } = payload;

    const qualityCheckFields = ['score', 'qualityPass', 'availabilityStatus'];
    const qualityCheckData: any = {};
    const candidateUpdateData: any = { ...(candidate || {}) };

    // Separate fields from the root payload
    for (const key in restPayload) {
      if (qualityCheckFields.includes(key)) {
        qualityCheckData[key] = restPayload[key];
      } else {
        candidateUpdateData[key] = restPayload[key];
      }
    }

    // Fields to protect from manual updates for QualityCheck
    const protectedFields = ['id', 'candidateId', 'cvId', 'createdAt', 'updatedAt', 'deletedAt', 'fullResponse'];
    protectedFields.forEach(field => delete qualityCheckData[field]);

    // Ensure protected candidate fields are not overwritten
    const protectedCandidateFields = [
      'id', 'createdAt', 'updatedAt', 'batchId', 'candidateId',
      'cvId', 'fullResponse', 'uploadTime'
    ];
    protectedCandidateFields.forEach(field => delete candidateUpdateData[field]);

    // Auto-sync status if passed in root
    if (qualityCheckData.qualityPass !== undefined) {
      candidateUpdateData.qualityStatus = qualityCheckData.qualityPass ? 'passed' : 'failed';
    }
    if (qualityCheckData.availabilityStatus !== undefined) {
      candidateUpdateData.availabilityStatus = qualityCheckData.availabilityStatus;
    }

    // 1. Update QualityCheck
    let updatedCheck;
    if (Object.keys(qualityCheckData).length > 0) {
      updatedCheck = await tx.qualityCheck.update({
        where: { id },
        data: qualityCheckData,
      });
    } else {
      updatedCheck = await tx.qualityCheck.findUnique({ where: { id } });
      if (!updatedCheck) {
        throw new ApiError(httpStatus.NOT_FOUND, "Quality check not found");
      }
    }

    // Geocode candidate address if updated OR if lat/long are missing and address is available
    let addressToGeocode = candidateUpdateData.address;

    if (!addressToGeocode) {
      const existingCandidate = await tx.candidate.findUnique({
        where: { id: updatedCheck.candidateId },
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
        candidateUpdateData.latitude = coords.lat;
        candidateUpdateData.longitude = coords.lng;
      }
    }

    // 2. Update Candidate
    if (Object.keys(candidateUpdateData).length > 0) {
      await tx.candidate.update({
        where: { id: updatedCheck.candidateId },
        data: candidateUpdateData
      });
    }

    // Return the updated check with candidate info
    return await tx.qualityCheck.findUnique({
      where: { id },
      include: { candidate: true }
    });
  });
  return result;
};

const deleteQualityCheck = async (id: string) => {
  const result = await prisma.qualityCheck.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  return result;
};

const deleteAllQualityChecks = async () => {
  const result = await prisma.qualityCheck.deleteMany({});
  return result;
};

export const qualityCheckServices = {
  runQualityCheckWithRetry,
  syncAllPendingChecks,
  processAiResponse,
  getAllQualityChecks,
  getQualityCheckById,
  updateQualityCheck,
  deleteQualityCheck,
  deleteAllQualityChecks,
};
