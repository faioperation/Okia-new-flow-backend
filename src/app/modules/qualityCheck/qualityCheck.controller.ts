import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";
import { qualityCheckServices } from "./qualityCheck.service";
import ApiError from "../../errors/ApiError";
import { prisma } from "../../db_connection";

const createQualityCheck = catchAsync(async (req: Request, res: Response) => {
  const { batch_id } = req.body;

  if (!batch_id) {
    throw new ApiError(httpStatus.BAD_REQUEST, "batch_id is required");
  }

  // Use the correct service method name
  const result = await qualityCheckServices.runQualityCheckWithRetry(batch_id);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Quality check triggered successfully via AI",
    data: result,
  });
});

const getAllQualityChecks = catchAsync(async (req: Request, res: Response) => {
  const result = await qualityCheckServices.getAllQualityChecks(req.query);

  // Get global counts (ignoring filters for the dashboard)
  const allChecks = await prisma.qualityCheck.findMany({
    where: { deletedAt: null }
  });

  const totalQualityPassCount = allChecks.filter(check => check.qualityPass === true).length;
  const totalQualityFailedCount = allChecks.filter(check => check.qualityPass === false).length;
  const totalUploadCount = allChecks.length;

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Quality checks fetched successfully",
    meta: result.meta,
    totalUploadCount,
    totalQualityPassCount,
    totalQualityFailedCount,
    data: result.data,
  });
});

const getQualityCheckById = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await qualityCheckServices.getQualityCheckById(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Quality check fetched successfully",
    data: result,
  });
});

const deleteQualityCheck = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await qualityCheckServices.deleteQualityCheck(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Quality check deleted successfully",
    data: result,
  });
});

const updateQualityCheck = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const payload = req.body;
  const result = await qualityCheckServices.updateQualityCheck(id, payload);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Quality check updated successfully",
    data: result,
  });
});

const deleteAllQualityChecks = catchAsync(async (req: Request, res: Response) => {
  const result = await qualityCheckServices.deleteAllQualityChecks();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All quality checks deleted successfully",
    data: result,
  });
});

const processAiCallback = catchAsync(async (req: Request, res: Response) => {
  const aiData = req.body;
  const authHeader = req.headers['backend-header'];

  // Verify token for production security
  if (authHeader !== 'fjdsof798sdfasdfji23rf89sdfjdf4') {
    console.warn(`[AI Callback] Unauthorized attempt with token: ${authHeader}`);
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid AI callback token");
  }

  console.log(`[AI Callback] Received data:`, JSON.stringify(aiData, null, 2));
  
  const result = await qualityCheckServices.processAiResponse(aiData);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "AI callback processed successfully",
    data: result,
  });
});

export const qualityCheckControllers = {
  createQualityCheck,
  getAllQualityChecks,
  getQualityCheckById,
  updateQualityCheck,
  deleteQualityCheck,
  deleteAllQualityChecks,
  processAiCallback,
};
