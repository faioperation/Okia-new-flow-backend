import { Request, Response } from "express";
import { catchAsync } from "../../../utils/catchAsync";
import { sendResponse } from "../../../utils/sendResponse";
import httpStatus from "http-status";
import { prisma } from "../../../db_connection";

const getAllCandidates = catchAsync(async (req: Request, res: Response) => {
  const result = await prisma.candidate.findMany({
    where: {
      aiCheck: false
    },

    include: {
      cvFiles: true,
      skills: true,
      educations: true,
      employmentHistories: true,
      batch: true
    },


    orderBy: { createdAt: 'desc' }
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All candidates fetched successfully (Public API)",
    data: result,
  });
});

export const bulkCVControllers = {
  getAllCandidates,
};
