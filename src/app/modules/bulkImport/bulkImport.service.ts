import { prisma } from "../../db_connection";
import { extractTextFromPdf } from "../../utils/bulk-import-utils/pdfExtractor";
import { parseCandidateData } from "../../utils/bulk-import-utils/candidateParser";
import { cvProcessingQueue } from "./bulkImport.queue";
import fs from 'fs/promises';

const processSingleCv = async (
  file: Express.Multer.File, 
  batchId: string,
  retryCount = 0
) => {
  const maxRetries = Number(process.env.CV_QUEUE_RETRY) || 2;
  
  try {
    // 1. Extract Text
    const text = await extractTextFromPdf(file.path);

    // 2. Parse Data
    const parsedData = await parseCandidateData(text);
    console.log(`[Batch ${batchId}] Extracted JSON for ${file.originalname}:`, JSON.stringify(parsedData, null, 2));

    // 3. Duplicate Detection
    const email = parsedData.contact?.email;
    const phone = parsedData.contact?.phone;

    const existingCandidate = await prisma.candidate.findFirst({
      where: {
        OR: [
          { emailAddress: email && email !== "" ? email : undefined },
          { contactNumber: phone && phone !== "" ? phone : undefined }
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
          reason: `Duplicate detected: ${email || phone}`,
        }
      });
      return;
    }

    // 3. Database Transaction
    await prisma.$transaction(async (tx) => {
      await tx.candidate.create({
        data: {
          candidateName: parsedData.candidate_name,
          emailAddress: parsedData.contact?.email,
          contactNumber: parsedData.contact?.phone,
          jobTitle: parsedData.employment_history?.[0]?.job_title || "",
          address: parsedData.contact?.location,
          experienceYears: parsedData.total_years_experience,
          professionalProfile: parsedData.professional_summary,
          rawExtractedText: text,
          extractedJson: parsedData as any,
          availabilityStatus: 'available',
          batchId: batchId,
          skills: {
            create: parsedData.top_skills?.map(skill => ({ skillName: skill }))
          },
          educations: {
            create: parsedData.education?.map(edu => ({
              degreeName: edu.degree,
              institutionName: edu.institution,
              startYear: parseInt(edu.passing_year) || 0,
              endYear: 0
            }))
          },
          employmentHistories: {
            create: parsedData.employment_history?.map(emp => ({
              companyName: emp.company,
              jobTitle: emp.job_title,
              startDate: undefined,
              endDate: undefined,
              responsibilities: emp.responsibilities?.join('\n')
            }))
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
    console.log(`[Batch ${batchId}] Candidate ${parsedData.candidate_name} saved to database.`);

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
      cvProcessingQueue.add(() => processSingleCv(file, batchId, retryCount + 1));
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

const startBulkImport = async (files: Express.Multer.File[]) => {
  // Create Batch record
  const batch = await prisma.bulkUploadBatch.create({
    data: {
      totalFiles: files.length,
      pendingFiles: files.length,
      status: "processing"
    }
  });

  files.forEach(file => {
    cvProcessingQueue.add(() => processSingleCv(file, batch.id));
  });

  return batch.id;
};

export const bulkImportServices = {
  startBulkImport,
};
