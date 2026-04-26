import { prisma } from "../../db_connection";
import config from "../../config";
import ApiError from "../../errors/ApiError";
import httpStatus from "http-status";

const processAiResponse = async (aiResponse: any) => {
  if (aiResponse.status !== 'success' || !Array.isArray(aiResponse.data)) {
    return [];
  }

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

  return results;
};


const runQualityCheckWithRetry = async (batchId: string, attempt = 1) => {
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

    const response = await fetch(`${config.AI_API_URL}/qualify`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Backend-Token': config.AI_HEADER_KEY
      },
      body: JSON.stringify({ candidate_id: targetCandidateId })
    });

    console.log(`[AI Check] API Response Status: ${response.status}`);

    if (response.ok) {
      const aiData = await response.json() as any;
      console.log(`[AI Check] API Data received. Status: ${aiData.status}`);
      
      const processed = await processAiResponse(aiData);
      console.log(`[AI Check] Processed ${processed.length} results.`);
      
      if (processed.length > 0) {
        console.log(`[AI Check] SUCCESS: AI data saved for candidates.`);
        return;
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

    setTimeout(() => runQualityCheckWithRetry(batchId, attempt + 1), delay);
  } else {
    console.error(`[AI Check] Failed to get AI data after ${maxAttempts} attempts.`);

  }
};


const syncAllPendingChecks = async () => {
  console.log(`[AI Sync] Starting 12-hour sync...`);
  try {
    const response = await fetch(`${config.AI_API_URL}/qualify`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Backend-Token': config.AI_HEADER_KEY
      },
      body: JSON.stringify({})
    });


    if (response.ok) {
      const aiData = await response.json();
      await processAiResponse(aiData);
    }
  } catch (error) {
    console.error(`[AI Sync] Sync failed:`, error);
  }
};

const getAllQualityChecks = async () => {
  const result = await prisma.qualityCheck.findMany({
    where: { deletedAt: null },
    include: { candidate: true },
  });
  return result;
};

const getQualityCheckById = async (id: string) => {
  const result = await prisma.qualityCheck.findUnique({
    where: { id, deletedAt: null },
    include: { candidate: true },
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

export const qualityCheckServices = {
  runQualityCheckWithRetry,
  syncAllPendingChecks,
  getAllQualityChecks,
  getQualityCheckById,
  deleteQualityCheck,
};
