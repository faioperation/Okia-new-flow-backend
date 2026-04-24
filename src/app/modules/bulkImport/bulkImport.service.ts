import { prisma } from "../../db_connection";
import { extractTextFromPdf } from "../../utils/bulk-import-utils/pdfExtractor";
import { parseCandidateData } from "../../utils/bulk-import-utils/candidateParser";
import { checkCandidateQuality, IQualityCheckCriteria } from "../../utils/bulk-import-utils/qualityChecker";
import { cvProcessingQueue } from "./bulkImport.queue";
import fs from 'fs/promises';

const processSingleCv = async (
  file: Express.Multer.File, 
  criteria: IQualityCheckCriteria, 
  batchId: string,
  retryCount = 0
) => {
  const maxRetries = Number(process.env.CV_QUEUE_RETRY) || 2;
  
  try {
    // 1. Extract Text
    const text = await extractTextFromPdf(file.path);

    // 2. Parse Data
    const parsedData = parseCandidateData(text);

    // 3. Duplicate Detection
    const existingCandidate = await prisma.candidate.findFirst({
      where: {
        OR: [
          { emailAddress: parsedData.emailAddress && parsedData.emailAddress !== "" ? parsedData.emailAddress : undefined },
          { contactNumber: parsedData.contactNumber && parsedData.contactNumber !== "" ? parsedData.contactNumber : undefined }
        ]
      }
    });

    if (existingCandidate) {
      await prisma.bulkUploadBatch.update({
        where: { id: batchId },
        data: { 
          duplicateFiles: { increment: 1 },
          pendingFiles: { decrement: 1 }
        }
      });

      await prisma.bulkUploadFailLog.create({
        data: {
          batchId,
          fileName: file.originalname,
          filePath: file.path,
          reason: `Duplicate detected: ${parsedData.emailAddress || parsedData.contactNumber}`,
        }
      });
      return;
    }

    // 4. Quality Check
    const qualityStatus = checkCandidateQuality(parsedData, criteria);

    // 5. Database Transaction
    await prisma.$transaction(async (tx) => {
      await tx.candidate.create({
        data: {
          candidateName: parsedData.candidateName,
          emailAddress: parsedData.emailAddress,
          contactNumber: parsedData.contactNumber,
          jobTitle: parsedData.jobTitle,
          address: parsedData.address,
          experienceYears: parsedData.experienceYears,
          professionalProfile: parsedData.professionalProfile,
          rawExtractedText: text,
          qualityStatus: qualityStatus,
          availabilityStatus: 'available',
          batchId: batchId,
          skills: {
            create: parsedData.skills.map(skill => ({ skillName: skill }))
          },
          cvFiles: {
            create: {
              fileUrl: file.path,
              fileType: 'old_cv',
              versionNo: 1,
              generatedByAi: false
            }
          }
        }
      });
    });

    // 6. Update Batch Progress
    await prisma.bulkUploadBatch.update({
      where: { id: batchId },
      data: { 
        completedFiles: { increment: 1 },
        pendingFiles: { decrement: 1 }
      }
    });

  } catch (error: any) {
    if (retryCount < maxRetries) {
      console.log(`Retrying CV: ${file.originalname} (Attempt ${retryCount + 1})`);
      cvProcessingQueue.add(() => processSingleCv(file, criteria, batchId, retryCount + 1));
      return;
    }

    console.error(`Failed to process CV after ${maxRetries} retries: ${file.originalname}`, error);
    
    // Log failure and update batch
    await prisma.bulkUploadBatch.update({
      where: { id: batchId },
      data: { 
        failedFiles: { increment: 1 },
        pendingFiles: { decrement: 1 }
      }
    });

    await prisma.bulkUploadFailLog.create({
      data: {
        batchId,
        fileName: file.originalname,
        filePath: file.path,
        reason: error.message || "Unknown error during processing",
        errorStack: error.stack
      }
    });

    // Cleanup orphan file if processing totally failed
    try {
      await fs.unlink(file.path);
    } catch (e) {
      console.error("Cleanup failed for", file.path);
    }
  } finally {
    // Check if batch is completed
    const updatedBatch = await prisma.bulkUploadBatch.findUnique({
      where: { id: batchId }
    });

    if (updatedBatch && updatedBatch.pendingFiles === 0) {
      await prisma.bulkUploadBatch.update({
        where: { id: batchId },
        data: { 
          status: "completed",
          completedAt: new Date()
        }
      });
    }
  }
};

const startBulkImport = async (files: Express.Multer.File[], criteria: IQualityCheckCriteria) => {
  // Create Batch record
  const batch = await prisma.bulkUploadBatch.create({
    data: {
      totalFiles: files.length,
      pendingFiles: files.length,
      status: "processing"
    }
  });

  files.forEach(file => {
    cvProcessingQueue.add(() => processSingleCv(file, criteria, batch.id));
  });

  return batch.id;
};

export const bulkImportServices = {
  startBulkImport,
};
