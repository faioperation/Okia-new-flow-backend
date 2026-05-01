import { Request, Response } from "express";
import { catchAsync } from "../../../utils/catchAsync";
import { sendResponse } from "../../../utils/sendResponse";
import httpStatus from "http-status";
import { qualityCheckServices } from "../../qualityCheck/qualityCheck.service";

const getAllQualityChecks = catchAsync(async (req: Request, res: Response) => {
  const result = await qualityCheckServices.getAllQualityChecks(req.query, true);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All quality checks fetched successfully (Public API)",
    meta: result.meta,
    data: result.data,
  });
});

const getQualityCheckById = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await qualityCheckServices.getQualityCheckById(id, true);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    count: result ? 1 : 0,
    success: true,
    message: "Quality check fetched successfully (Public API)",
    data: result,
  });
});

export const qualityCheckPublicControllers = {
  getAllQualityChecks,
  getQualityCheckById,
};
