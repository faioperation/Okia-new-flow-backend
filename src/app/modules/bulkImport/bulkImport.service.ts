import { prisma } from "../../db_connection";
import { activityLogServices } from "../activityLog/activityLog.service";
import { extractTextFromPdf } from "../../utils/bulk-import-utils/pdfExtractor";
import { parseCandidateData } from "../../utils/bulk-import-utils/candidateParser";
import { cvProcessingQueue } from "./bulkImport.queue";
import fs from 'fs/promises';
import config from "../../config";
import { qualityCheckServices } from "../qualityCheck/qualityCheck.service";
import { getCoordinates } from "../../utils/geocoder";
import { sendEmail } from "../../utils/sendEmail";

const processSingleCv = async (
  file: Express.Multer.File, 
  batchId: string,
  rules?: any,
  retryCount = 0
) => {
  const maxRetries = config.CV_QUEUE_RETRY;
  
  try {
    // 1. Extract Text
    const text = await extractTextFromPdf(file.path);

    // 2. Parse Data
    const parsedData = await parseCandidateData(text);

    // Geocode address
    let latitude = null;
    let longitude = null;
    if (parsedData.contact?.location) {
      const coords = await getCoordinates(parsedData.contact.location);
      if (coords) {
        latitude = coords.lat;
        longitude = coords.lng;
      }
    }


    // 4. Database Transaction
    await prisma.$transaction(async (tx) => {
      await tx.candidate.create({
        data: {
          candidateName: parsedData.candidate_name,
          emailAddress: parsedData.contact?.email,
          contactNumber: parsedData.contact?.phone,
          jobTitle: parsedData.employment_history?.[0]?.job_title || "",
          address: parsedData.contact?.location,
          latitude,
          longitude,
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
  }
};



const startBulkImport = async (files: Express.Multer.File[], rules: any, userId: string) => {
  if (files.length > 100) {
    throw new Error("Maximum 100 CV files can be uploaded at once.");
  }

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

  const processingPromises = files.map(file => {
    return cvProcessingQueue.add(() => processSingleCv(file, batch.id, rules));
  });

  // 1. Wait for all CV extractions to complete
  console.log(`[Batch ${batch.id}] Waiting for all CV extractions to finish in queue...`);
  await Promise.all(processingPromises);

  // 2. Mark Batch as completed in terms of extraction
  const updatedBatch = await prisma.bulkUploadBatch.update({
    where: { id: batch.id },
    data: { 
      status: "completed",
      completedAt: new Date()
    }
  });

  console.log(`[Batch ${batch.id}] EXTRACTION FINISHED. Results:- Passed: ${updatedBatch.completedFiles}, Failed: ${updatedBatch.failedFiles}`);

  // 3. Trigger AI Quality Check and WAIT for it to finish
  console.log(`[Batch ${batch.id}] NOW STARTING AI Quality Check (Waiting for AI)...`);
  const qualityResults = await qualityCheckServices.runQualityCheckWithRetry(batch.id, rules);
  
  if (qualityResults) {
    console.log(`[Batch ${batch.id}] AI Quality Check COMPLETED with ${qualityResults.length} results.`);
  } else {
    console.log(`[Batch ${batch.id}] AI Quality Check FINISHED but returned no data.`);
  }

  // 4. Send Outreach Emails in background (don't await)
  sendOutreachEmails(batch.id);

  return {
    batchId: batch.id,
    totalFiles: updatedBatch.totalFiles,
    completedFiles: updatedBatch.completedFiles,
    failedFiles: updatedBatch.failedFiles,
    qualityResults: qualityResults || []
  };
};

const sendOutreachEmails = async (batchId: string) => {
  try {
    console.log(`[Batch ${batchId}] Starting background outreach email sequence...`);
    const candidates = await prisma.candidate.findMany({
      where: { batchId },
      select: { id: true, candidateName: true, emailAddress: true }
    });

    for (const cand of candidates) {
      if (cand.emailAddress) {
        const firstName = cand.candidateName.split(' ')[0] || "Candidate";
        console.log(`[Email] outreach email is send sending to ${cand.emailAddress} (${firstName})...`);
        
        try {
          await sendEmail({
            to: cand.emailAddress,
            subject: "Opportunity Check: Your availability for education roles",
            tempName: "outreach",
            tempData: { firstName }
          });

          await prisma.bulkOutreachLog.create({
            data: {
              batchId,
              candidateId: cand.id,
              email: cand.emailAddress,
              status: "sent"
            }
          });
          
          console.log(`[Email] outreach email to ${cand.emailAddress} done.✅`);
        } catch (error: any) {
          await prisma.bulkOutreachLog.create({
            data: {
              batchId,
              candidateId: cand.id,
              email: cand.emailAddress,
              status: "failed"
            }
          });
          console.error(`[Email] outreach email to ${cand.emailAddress} failed.❌ Error: ${error.message}`);
        }
        
        // Add a small delay to prevent SMTP socket closure
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  } catch (error) {
    console.error(`[Email] Background outreach sequence failed for batch ${batchId}`, error);
  }
};


export const bulkImportServices = {
  startBulkImport,
};
