import { prisma } from "../../db_connection";
import { activityLogServices } from "../activityLog/activityLog.service";
import { extractTextFromPdf } from "../../utils/bulk-import-utils/pdfExtractor";
import { parseCandidateData } from "../../utils/bulk-import-utils/candidateParser";
import { cvProcessingQueue } from "./bulkImport.queue";
import fs from 'fs/promises';
import config from "../../config";
import { qualityCheckServices } from "../qualityCheck/qualityCheck.service";

const processSingleCv = async (
  file: Express.Multer.File, 
  batchId: string,
  rules?: any,
  retryCount = 0
) => {
  const maxRetries = Number(process.env.CV_QUEUE_RETRY) || 2;
  
  try {
    // 1. Extract Text
    const text = await extractTextFromPdf(file.path);

    // 2. Parse Data
    const parsedData = await parseCandidateData(text);

    // 3. Duplicate Detection (Disabled per user request: "every cv can be upload")
    /*
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
    */

    // 4. Database Transaction
    await prisma.$transaction(async (tx) => {
      await tx.candidate.create({
        data: {
          candidateName: parsedData.candidate_name,
          emailAddress: parsedData.contact?.email,
          contactNumber: parsedData.contact?.phone,
          jobTitle: parsedData.employment_history?.[0]?.job_title || "",
          address: parsedData.contact?.location,
          experienceYears: Math.min(parsedData.total_years_experience || 0, 100),
          professionalProfile: parsedData.professional_summary,
          rawExtractedText: text,
          extractedJson: parsedData as any,
          rawPdfPath: `/${file.path.replace(/\\/g, '/')}`,
          rawPdfUrl: `${config.BACKEND_URL}/${file.path.replace(/\\/g, '/')}`,
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
              responsibilities: emp.responsibilities?.join('\n')
            }))
          },
          cvFiles: {
            create: {
              fileUrl: `${config.BACKEND_URL}/${file.path.replace(/\\/g, '/')}`,
              filePath: file.path.replace(/\\/g, '/'),
              fileType: 'old_cv',
              versionNo: 1,
              generatedByAi: false
            }
          }
        }
      });
    });

    // 5. Update Batch Progress
    await prisma.bulkUploadBatch.update({
      where: { id: batchId },
      data: { 
        completedFiles: { increment: 1 },
        pendingFiles: { decrement: 1 }
      }
    });

  } catch (error: any) {
    if (retryCount < maxRetries) {
      cvProcessingQueue.add(() => processSingleCv(file, batchId, rules, retryCount + 1));
      return;
    }

    console.error(`[Error] CV Processing Failed: ${file.originalname}`, error.message);
    
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

    try {
      await fs.unlink(file.path);
    } catch (e) {
      console.error("Cleanup failed for", file.path);
    }
  } finally {
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
      console.log(`[Batch ${batchId}] CV EXTRACTION FINISHED. Results:- Passed: ${updatedBatch.completedFiles}, Failed: ${updatedBatch.failedFiles}, Duplicates: ${updatedBatch.duplicateFiles}`);
      
      // Trigger AI Quality Check after extraction is fully complete with a 30s initial delay
      console.log(`[Batch ${batchId}] Waiting 30 seconds before starting AI Quality Check...`);
      setTimeout(() => {
        qualityCheckServices.runQualityCheckWithRetry(batchId, rules);
      }, 30 * 1000);
    }
  }
};



const startBulkImport = async (files: Express.Multer.File[], rules: any, userId: string) => {
  const batch = await prisma.bulkUploadBatch.create({
    data: {
      totalFiles: files.length,
      pendingFiles: files.length,
      status: "processing"
    }
  });

  console.log(`[Batch ${batch.id}] Start processing to convert into JSON... (${files.length} files)`);

  // Log the activity
  await activityLogServices.createLog(
    userId,
    "CANDIDATE_UPLOAD",
    `Started bulk CV upload for ${files.length} files.`,
    { batchId: batch.id, fileCount: files.length }
  );

  files.forEach(file => {
    cvProcessingQueue.add(() => processSingleCv(file, batch.id, rules));
  });

  return batch.id;
};


export const bulkImportServices = {
  startBulkImport,
};
