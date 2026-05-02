import { prisma } from "../../db_connection";
import config from "../../config";
import { activityLogServices } from '../activityLog/activityLog.service';
import { generateCvPdf } from "../../utils/pdfGenerator";
import path from "path";
import fs from "fs";
import httpStatus from "http-status";
import ApiError from "../../errors/ApiError";

const createGeneratedCv = async (userId: string, qualityCheckId: string) => {
  // Validate UUID format before querying the database
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (!uuidRegex.test(qualityCheckId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid id provided");
  }

  // 1. Check if a QualityCheck record exists
  const qualityCheck = await prisma.qualityCheck.findUnique({
    where: { id: qualityCheckId },
    include: {
      candidate: true
    }
  });

  if (!qualityCheck) {
    throw new ApiError(httpStatus.NOT_FOUND, "QualityCheck record not found");
  }

  const rawPdfUrl = qualityCheck.candidate?.rawPdfUrl;
  const rawPdfPath = qualityCheck.candidate?.rawPdfPath;

  // 2. Call AI API to generate CV data
  const aiUrl = `${config.AI_API_URL}/cv-generate/${qualityCheckId}`;
  
  const response = await fetch(aiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Backend-Token': config.AI_HEADER_KEY
    }
  });

  if (!response.ok) {
    throw new Error(`AI CV Generation failed: ${response.statusText}`);
  }

  const aiResponse = await response.json();
  const cvData = aiResponse.data;

  // 3. Database Transaction to Upsert
  const result = await prisma.$transaction(async (tx) => {
    let cvId = qualityCheck.cvId;

    if (cvId) {
      // UPDATE EXISTING
      await tx.generatedCV.update({
        where: { id: cvId },
        data: {
          firstName: cvData.header.first_name,
          expertise: cvData.header.expertise,
          professionalTitle: cvData.header.professional_title || null,
          location: cvData.header.location,
          contactDetails: cvData.header.contact_details,
          skills: cvData.skills,
          profileTitle: cvData.professional_profile.title,
          profileContent: cvData.professional_profile.content,
          aiRaw: aiResponse,
          rawPdfPath,
          rawPdfUrl,
        }
      });

      // Refresh Jobs
      await tx.job.deleteMany({ where: { cvId } });
      await tx.job.createMany({
        data: cvData.employment_history.jobs.map((job: any) => ({
          cvId: cvId as string,
          company: job.company_name,
          role: job.role,
          period: job.period,
          responsibilities: job.responsibilities
        }))
      });

      // Refresh Educations
      await tx.education.deleteMany({ where: { cvId } });
      await tx.education.createMany({
        data: cvData.education_qualifications.items.map((item: string) => ({
          cvId: cvId as string,
          title: item
        }))
      });

    } else {
      // CREATE NEW
      const newCv = await tx.generatedCV.create({
        data: {
          userId,
          firstName: cvData.header.first_name,
          expertise: cvData.header.expertise,
          professionalTitle: cvData.header.professional_title || null,
          location: cvData.header.location,
          contactDetails: cvData.header.contact_details,
          skills: cvData.skills,
          profileTitle: cvData.professional_profile.title,
          profileContent: cvData.professional_profile.content,
          logo: "https://i.ibb.co.com/CsTwmrMG/Edukai-Logox.png",
          aiRaw: aiResponse,
          rawPdfPath,
          rawPdfUrl,
          jobs: {
            create: cvData.employment_history.jobs.map((job: any) => ({
              company: job.company_name,
              role: job.role,
              period: job.period,
              responsibilities: job.responsibilities
            }))
          },
          educations: {
            create: cvData.education_qualifications.items.map((item: string) => ({
              title: item
            }))
          }
        }
      });
      cvId = newCv.id;

      // Link this CV back to the QualityCheck and mark as AI generated
      await tx.qualityCheck.update({
        where: { id: qualityCheckId },
        data: { cvId: cvId, aiGenerated: true }
      });
    }

    // Always ensure QualityCheck is marked as aiGenerated if we reach this point in either branch
    // but the logic above already covers linking. Let's make it consistent.
    if (cvId) {
      await tx.qualityCheck.update({
        where: { id: qualityCheckId },
        data: { aiGenerated: true }
      });
    }

    return await tx.generatedCV.findUnique({
      where: { id: cvId },
      include: { jobs: true, educations: true }
    });
  });

  // Log the activity
  if (result) {
    await activityLogServices.createLog(
      userId,
      "CV_PROCESSING",
      `Generated AI CV for ${result.firstName} (${result.professionalTitle})`,
      { cvId: result.id, qualityCheckId }
    );
  }

  return result;
};

const getAllGeneratedCvs = async (userId?: string) => {
  const result = await prisma.generatedCV.findMany({
    where: userId ? { userId } : {},
    include: {
      jobs: true,
      educations: true,
      qualityCheck: true
    },
    orderBy: { createdAt: 'desc' }
  });
  return result;
};

const getGeneratedCvById = async (id: string) => {
  const result = await prisma.generatedCV.findUnique({
    where: { id },
    include: {
      jobs: true,
      educations: true,
      qualityCheck: true
    }
  });
  return result;
};

const updateGeneratedCv = async (id: string, data: any) => {
  // Strip out system fields to avoid Prisma validation errors
  const { 
    id: _id, 
    userId: _userId, 
    createdAt: _createdAt, 
    updatedAt: _updatedAt, 
    jobs, 
    educations, 
    qualityCheck,
    ...cvData 
  } = data;

  const result = await prisma.$transaction(async (tx) => {
    // Update main CV data
    await tx.generatedCV.update({
      where: { id },
      data: cvData,
    });

    // Handle Jobs (delete and recreate)
    if (jobs && Array.isArray(jobs)) {
      await tx.job.deleteMany({ where: { cvId: id } });
      await tx.job.createMany({
        data: jobs.map((job: any) => {
          const { id: jId, cvId: jCvId, ...jobData } = job;
          return { ...jobData, cvId: id };
        })
      });
    }

    // Handle Educations (delete and recreate)
    if (educations && Array.isArray(educations)) {
      await tx.education.deleteMany({ where: { cvId: id } });
      await tx.education.createMany({
        data: educations.map((edu: any) => {
          const { id: eId, cvId: eCvId, ...eduData } = edu;
          return { ...eduData, cvId: id };
        })
      });
    }

    return await tx.generatedCV.findUnique({
      where: { id },
      include: { jobs: true, educations: true }
    });
  });

  return result;
};

const deleteGeneratedCv = async (id: string) => {
  const result = await prisma.generatedCV.delete({
    where: { id }
  });
  return result;
};

const deleteAllGeneratedCvs = async (userId?: string) => {
  const result = await prisma.generatedCV.deleteMany({
    where: userId ? { userId } : {},
  });
  return result;
};

const generateAndSavePdf = async (id: string) => {
  const result = await prisma.generatedCV.findUnique({
    where: { id },
    include: { jobs: true, educations: true }
  });
  
  if (!result) {
    throw new Error("Generated CV not found");
  }

  // Ensure upload directory exists
  const uploadDir = path.join(process.cwd(), "uploads", "generatedCVPdf");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const fileName = `cv-${id}-${Date.now()}.pdf`;
  const relativePath = `/uploads/generatedCVPdf/${fileName}`;
  const absolutePath = path.join(process.cwd(), "uploads", "generatedCVPdf", fileName);

  // Create a write stream to save the file
  const writeStream = fs.createWriteStream(absolutePath);

  // Generate and save the PDF
  await generateCvPdf(result, writeStream);

  // Wait for the stream to finish
  return new Promise((resolve, reject) => {
    writeStream.on("finish", async () => {
      const updated = await prisma.generatedCV.update({
        where: { id },
        data: {
          pdfPath: relativePath,
          pdfUrl: `${config.BACKEND_URL}/uploads/generatedCVPdf/${fileName}`
        } as any
      });
      resolve(updated);
    });
    writeStream.on("error", reject);
  });
};

export const generatedCvServices = {
  createGeneratedCv,
  getAllGeneratedCvs,
  getGeneratedCvById,
  updateGeneratedCv,
  deleteGeneratedCv,
  deleteAllGeneratedCvs,
  generateAndSavePdf
};
