import { prisma } from "../../db_connection";
import config from "../../config";

const createGeneratedCv = async (userId: string, qualityCheckId: string) => {
  // 1. Check if a CV already exists for this qualityCheckId
  const qualityCheck = await prisma.qualityCheck.findUnique({
    where: { id: qualityCheckId }
  });

  if (!qualityCheck) {
    throw new Error("QualityCheck record not found");
  }

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
          professionalTitle: cvData.header.professional_title,
          location: cvData.header.location,
          contactDetails: cvData.header.contact_details,
          profileTitle: cvData.professional_profile.title,
          profileContent: cvData.professional_profile.content,
          aiRaw: aiResponse,
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
          professionalTitle: cvData.header.professional_title,
          location: cvData.header.location,
          contactDetails: cvData.header.contact_details,
          profileTitle: cvData.professional_profile.title,
          profileContent: cvData.professional_profile.content,
          logo: "https://edukai.kai.id/theme/edumy/images/header-logo2.png",
          aiRaw: aiResponse,
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

      // Link this CV back to the QualityCheck
      await tx.qualityCheck.update({
        where: { id: qualityCheckId },
        data: { cvId: cvId }
      });
    }

    return await tx.generatedCV.findUnique({
      where: { id: cvId },
      include: { jobs: true, educations: true }
    });
  });

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
  const { jobs, educations, ...cvData } = data;

  const result = await prisma.$transaction(async (tx) => {
    // Update main CV data
    const updatedCv = await tx.generatedCV.update({
      where: { id },
      data: cvData,
    });

    // Handle Jobs (delete and recreate for simplicity in this CRUD, or update individually)
    if (jobs) {
      await tx.job.deleteMany({ where: { cvId: id } });
      await tx.job.createMany({
        data: jobs.map((job: any) => ({ ...job, cvId: id }))
      });
    }

    // Handle Educations
    if (educations) {
      await tx.education.deleteMany({ where: { cvId: id } });
      await tx.education.createMany({
        data: educations.map((edu: any) => ({ ...edu, cvId: id }))
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

export const generatedCvServices = {
  createGeneratedCv,
  getAllGeneratedCvs,
  getGeneratedCvById,
  updateGeneratedCv,
  deleteGeneratedCv
};
