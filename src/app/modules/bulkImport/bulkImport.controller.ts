import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { bulkImportServices } from "./bulkImport.service";
import httpStatus from "http-status";
import ApiError from "../../errors/ApiError";
import { prisma } from "../../db_connection";

const uploadCvs = catchAsync(async (req, res) => {
  const files = req.files as Express.Multer.File[];
  
  if (!files || files.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "No files uploaded.");
  }

  if (files.length > 100) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Maximum 100 CV files can be uploaded at once.");
  }

  const criteria = {
    minimumYearsExperience: Number(req.body.minimumYearsExperience) || 0,
    requiredSkills: req.body.requiredSkills ? JSON.parse(req.body.requiredSkills) : [],
    jobRole: req.body.jobRole || "",
    checkFormatting: req.body.checkFormatting === 'true'
  };

  const batchId = await bulkImportServices.startBulkImport(files, criteria);

  sendResponse(res, {
    statusCode: httpStatus.ACCEPTED,
    success: true,
    message: `${files.length} CV files uploaded and processing started.`,
    data: { batchId },
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

export const bulkImportControllers = {
  uploadCvs,
  getBatches,
  getBatchById,
  getBatchFailures
};
