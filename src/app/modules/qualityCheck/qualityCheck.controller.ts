import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";
import { qualityCheckServices } from "./qualityCheck.service";
import ApiError from "../../errors/ApiError";

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
  const result = await qualityCheckServices.getAllQualityChecks();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Quality checks fetched successfully",
    data: result,
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

export const qualityCheckControllers = {
  createQualityCheck,
  getAllQualityChecks,
  getQualityCheckById,
  deleteQualityCheck,
};
