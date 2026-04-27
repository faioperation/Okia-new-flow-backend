import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { bulkImportServices } from "./bulkImport.service";
import httpStatus from "http-status";
import ApiError from "../../errors/ApiError";
import { prisma } from "../../db_connection";
import { extractTextFromPdf } from "../../utils/bulk-import-utils/pdfExtractor";
import { parseCandidateData } from "../../utils/bulk-import-utils/candidateParser";

const uploadCvs = catchAsync(async (req, res) => {
  const files = req.files as Express.Multer.File[];
  
  if (!files || files.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "No files uploaded.");
  }

  if (files.length > 100) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Maximum 100 CV files can be uploaded at once.");
  }

  const { jobRole, minimumYearsExperience, requiredSkills, checkFormatting } = req.body;

  const rules = {
    job_role: jobRole,
    min_years_exp: minimumYearsExperience ? Number(minimumYearsExperience) : undefined,
    required_skills: typeof requiredSkills === 'string' ? JSON.parse(requiredSkills) : requiredSkills,
    check_formatting: checkFormatting === 'true' || checkFormatting === true
  };

  const batchId = await bulkImportServices.startBulkImport(files, rules);

  // For immediate feedback in POST response, extract first file's text
  let firstFilePreview = null;
  try {
    const text = await extractTextFromPdf(files[0].path);
    firstFilePreview = await parseCandidateData(text);
  } catch (error) {
    console.error("Preview extraction failed:", error);
  }

  sendResponse(res, {
    statusCode: httpStatus.ACCEPTED,
    success: true,
    message: `${files.length} CV files uploaded and processing started.`,
    data: { 
      batchId,
      preview: firstFilePreview 
    },
  });
});

const getBatches = catchAsync(async (req, res) => {
  const result = await prisma.bulkUploadBatch.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Batches fetched successfully",
    data: result,
  });
});

const getBatchById = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await prisma.bulkUploadBatch.findUnique({
    where: { id },
    include: {
      _count: {
        select: { failLogs: true, candidates: true }
      },
      candidates: {
        include: {
          cvFiles: true,
          skills: true
        }
      }
    }
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Batch not found");
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Batch status fetched successfully",
    data: result,
  });
});

const getBatchFailures = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await prisma.bulkUploadFailLog.findMany({
    where: { batchId: id },
    orderBy: { createdAt: 'desc' }
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Batch failures fetched successfully",
    data: result,
  });
});

const getAllCandidates = catchAsync(async (req, res) => {
  const result = await prisma.candidate.findMany({
    include: {
      cvFiles: true,
      skills: true,
      educations: true,
      employmentHistories: true,
      batch: true
    },

    orderBy: { createdAt: 'desc' }
  });

  const formattedResult = result.map((candidate: any) => {
    delete candidate.experienceYears;
    return candidate;
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All candidates fetched successfully",
    count: result.length,
    data: formattedResult
  });
});

const getCandidateById = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await prisma.candidate.findUnique({
    where: { id },
    include: {
      cvFiles: true,
      skills: true,
      educations: true,
      employmentHistories: true,
      batch: true
    }

  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Candidate not found");
  }

  const candidate: any = result;
  delete candidate.experienceYears;

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Candidate fetched successfully",
    data: candidate,
  });
});

export const bulkImportControllers = {
  uploadCvs,
  getBatches,
  getBatchById,
  getBatchFailures,
  getAllCandidates,
  getCandidateById
};
