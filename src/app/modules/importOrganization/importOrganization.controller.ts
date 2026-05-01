import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";
import { importOrganizationServices } from "./importOrganization.service";
import ApiError from "../../errors/ApiError";

const uploadExcelFiles = catchAsync(async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  const user = (req as any).user;

  if (!files || files.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "No files uploaded.");
  }

  const results = await importOrganizationServices.processExcelFiles(files, user.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `${files.length} Excel files processed. Individual items saved with unique IDs.`,
    data: results,
  });
});

const getAllImports = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const result = await importOrganizationServices.getAllImports(user.id, req.query);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All imported items fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getImportById = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const userId = (req as any).user.id;
  const result = await importOrganizationServices.getImportById(id, userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Imported organization fetched successfully",
    data: result,
  });
});

const deleteImport = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const user = (req as any).user;
  const result = await importOrganizationServices.deleteImport(id, user.id);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Item deleted successfully",
    data: result,
  });
});

const deleteAllImports = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const result = await importOrganizationServices.deleteAllImports(user.id);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All imported organizations deleted successfully",
    data: result,
  });
});

const updateImport = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const userId = (req as any).user.id;
  const result = await importOrganizationServices.updateImport(id, userId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Imported organization updated successfully",
    data: result,
  });
});

export const importOrganizationControllers = {
  uploadExcelFiles,
  getAllImports,
  getImportById,
  updateImport,
  deleteImport,
  deleteAllImports,
};
