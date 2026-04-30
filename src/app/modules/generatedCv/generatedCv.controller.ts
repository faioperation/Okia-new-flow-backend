import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";
import { generatedCvServices } from "./generatedCv.service";
import ApiError from "../../errors/ApiError";
import { generateCvPdf } from "../../utils/pdfGenerator";
import fs from "fs";
import path from "path";
import { prisma } from "../../db_connection";

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

const getGeneratedCvById = catchAsync(async (req: Request, Response: Response) => {
  const id = req.params.id;
  const result = await generatedCvServices.getGeneratedCvById(id as string);
  
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Generated CV not found");
  }

  sendResponse(Response, {
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

const deleteAllGeneratedCvs = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const result = await generatedCvServices.deleteAllGeneratedCvs(userId);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All generated CVs deleted successfully",
    data: result,
  });
});

const generatePdf = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const updated = await generatedCvServices.generateAndSavePdf(id) as any;

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "PDF generated and saved successfully",
    data: {
      id: updated.id,
      firstName: updated.firstName,
      pdfUrl: updated.pdfUrl,
      pdfPath: updated.pdfPath
    }
  });
});

const downloadPdf = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await generatedCvServices.getGeneratedCvById(id) as any;
  
  if (!result || !result.pdfPath) {
    throw new ApiError(httpStatus.NOT_FOUND, "PDF not found for this CV. Please generate it first.");
  }

  // Resolve the relative path to an absolute path for reading
  const absolutePath = path.join(process.cwd(), result.pdfPath);

  if (!fs.existsSync(absolutePath)) {
    throw new ApiError(httpStatus.NOT_FOUND, "PDF file missing on server. Please regenerate.");
  }

  // Set response headers and stream the file to the user
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=cv-${id}.pdf`);
  fs.createReadStream(absolutePath).pipe(res);
});

export const generatedCvControllers = {
  createGeneratedCv,
  getAllGeneratedCvs,
  getGeneratedCvById,
  updateGeneratedCv,
  deleteGeneratedCv,
  deleteAllGeneratedCvs,
  generatePdf,
  downloadPdf
};
