import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";
import { importContactServices } from "./importContact.service";

const processExcelFiles = catchAsync(async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  const userId = (req as any).user.id;

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
  const result = await importContactServices.getAllImports(userId);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Imported contacts fetched successfully",
    count: result.length,
    data: result,
  });
});

const deleteImport = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const id = req.params.id;

  const result = await importContactServices.deleteImport(id, userId);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Imported contact deleted successfully",
    data: result,
  });
});

export const importContactControllers = {
  processExcelFiles,
  getAllImports,
  deleteImport,
};
