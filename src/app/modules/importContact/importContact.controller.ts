import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";
import { importContactServices } from "./importContact.service";
import ApiError from "../../errors/ApiError";

const processExcelFiles = catchAsync(async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  const userId = (req as any).user.id;

  if (!files || files.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "No files uploaded.");
  }

  const result = await importContactServices.processExcelFiles(files, userId);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Contact Excel files processed successfully",
    data: result,
  });
});

const getAllImports = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const result = await importContactServices.getAllImports(userId, req.query);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Imported contacts fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

const deleteImport = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const id = req.params.id as string;

  const result = await importContactServices.deleteImport(id, userId);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Imported contact deleted successfully",
    data: result,
  });
});

const deleteAllImports = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const result = await importContactServices.deleteAllImports(userId);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All imported contacts deleted successfully",
    data: result,
  });
});

export const importContactControllers = {
  processExcelFiles,
  getAllImports,
  deleteImport,
  deleteAllImports,
};
