import { Request, Response } from "express";
import { catchAsync } from "../../../utils/catchAsync";
import { sendResponse } from "../../../utils/sendResponse";
import httpStatus from "http-status";
import { generatedCvServices } from "../../generatedCv/generatedCv.service";
import ApiError from "../../../errors/ApiError";

const getAllGeneratedCvs = catchAsync(async (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  const result = await generatedCvServices.getAllGeneratedCvs(userId);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Public Generated CVs fetched successfully",
    count: result.length,
    data: result,
  });
});

const getGeneratedCvById = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await generatedCvServices.getGeneratedCvById(id);
  
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Generated CV not found");
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Public Generated CV fetched successfully",
    data: result,
  });
});

export const generatedCvPublicControllers = {
  getAllGeneratedCvs,
  getGeneratedCvById,
};
