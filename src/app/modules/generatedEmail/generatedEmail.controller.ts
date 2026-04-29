import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";
import { generatedEmailServices } from "./generatedEmail.service";
import ApiError from "../../errors/ApiError";
import { GeneratedEmail } from "../../../generated/prisma";

const createGeneratedEmail = catchAsync(async (req: Request, res: Response) => {
  const { generatedCvId, contactIds } = req.body;
  const userId = (req as any).user?.id;

  if (!generatedCvId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "generatedCvId is required");
  }

  const result = await generatedEmailServices.createGeneratedEmail(userId, generatedCvId, contactIds || []);
  
  sendResponse<GeneratedEmail>(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Email generated successfully via AI",
    data: result,
  });
});

const getAllGeneratedEmails = catchAsync(async (req: Request, res: Response) => {
  const userId = req.query.userId as string | undefined;
  const result = await generatedEmailServices.getAllGeneratedEmails(userId);
  
  sendResponse<GeneratedEmail[]>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Generated emails fetched successfully",
    count: result.length,
    data: result,
  });
});

const getGeneratedEmailById = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await generatedEmailServices.getGeneratedEmailById(id);
  
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Generated email not found");
  }

  sendResponse<GeneratedEmail>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Generated email fetched successfully",
    data: result,
  });
});

const updateGeneratedEmail = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await generatedEmailServices.updateGeneratedEmail(id, req.body);
  
  sendResponse<GeneratedEmail>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Generated email updated successfully",
    data: result,
  });
});

const deleteGeneratedEmail = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  await generatedEmailServices.deleteGeneratedEmail(id);
  
  sendResponse<null>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Generated email deleted successfully",
    data: null,
  });
});

const sendGeneratedEmail = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await generatedEmailServices.sendGeneratedEmail(id);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Email sent successfully",
    data: result,
  });
});

export const generatedEmailControllers = {
  createGeneratedEmail,
  getAllGeneratedEmails,
  getGeneratedEmailById,
  updateGeneratedEmail,
  deleteGeneratedEmail,
  sendGeneratedEmail,
};
