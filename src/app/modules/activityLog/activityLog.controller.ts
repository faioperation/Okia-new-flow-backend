import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";
import { activityLogServices } from "./activityLog.service";

const getAllLogs = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const result = await activityLogServices.getAllLogs(userId, req.query);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Activity logs fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

export const activityLogControllers = {
  getAllLogs,
};
