import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";
import { bulkOutreachLogServices } from "./bulkOutreachLog.service";

const getAllOutreachLogs = catchAsync(async (req: Request, res: Response) => {
  const result = await bulkOutreachLogServices.getAllOutreachLogs(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Outreach logs fetched successfully",
    data: result,
  });
});

const getOutreachLogsByBatch = catchAsync(async (req: Request, res: Response) => {
  const { batchId } = req.params;
  const result = await bulkOutreachLogServices.getOutreachLogsByBatch(batchId as string);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Batch outreach logs fetched successfully",
    data: result,
  });
});

export const bulkOutreachLogControllers = {
  getAllOutreachLogs,
  getOutreachLogsByBatch
};
