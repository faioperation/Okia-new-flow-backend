import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";
import { dashboardOverviewServices } from "./dashboardOverview.service";

const getStats = catchAsync(async (req: Request, res: Response) => {
  const result = await dashboardOverviewServices.getStats();
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Dashboard statistics fetched successfully",
    data: result,
  });
});

export const dashboardOverviewControllers = {
  getStats,
};
