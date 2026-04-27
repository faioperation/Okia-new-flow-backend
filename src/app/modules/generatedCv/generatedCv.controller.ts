import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";
import { generatedCvServices } from "./generatedCv.service";
import ApiError from "../../errors/ApiError";

const createGeneratedCv = catchAsync(async (req: Request, res: Response) => {
  const { qualityCheckId } = req.body;
  const userId = (req as any).user.id;

  const result = await generatedCvServices.createGeneratedCv(userId, qualityCheckId);
  
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Generated CV created successfully via AI",
    data: result,
  });
});

const getAllGeneratedCvs = catchAsync(async (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  const result = await generatedCvServices.getAllGeneratedCvs(userId);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Generated CVs fetched successfully",
    count: result.length,
    data: result,
  });
});

const getGeneratedCvById = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;
  const result = await generatedCvServices.getGeneratedCvById(id as string);
  
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Generated CV not found");
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Generated CV fetched successfully",
    data: result,
  });
});

const updateGeneratedCv = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;
  const result = await generatedCvServices.updateGeneratedCv(id as string, req.body);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Generated CV updated successfully",
    data: result,
  });
});

const deleteGeneratedCv = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;
  const result = await generatedCvServices.deleteGeneratedCv(id as string);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Generated CV deleted successfully",
    data: result,
  });
});

export const generatedCvControllers = {
  createGeneratedCv,
  getAllGeneratedCvs,
  getGeneratedCvById,
  updateGeneratedCv,
  deleteGeneratedCv
};
