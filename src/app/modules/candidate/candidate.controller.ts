import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { candidateServices } from "./candidate.service";
import httpStatus from "http-status";

const createCandidate = catchAsync(async (req, res) => {
  const userId = (req as any).user.id;
  const result = await candidateServices.createCandidate(req.body, userId);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Candidate created successfully",
    data: result,
  });
});

const getAllCandidates = catchAsync(async (req, res) => {
  const result = await candidateServices.getAllCandidates(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Candidates fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getSingleCandidate = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await candidateServices.getSingleCandidate(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Candidate fetched successfully",
    data: result,
  });
});

const updateCandidate = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await candidateServices.updateCandidate(id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Candidate updated successfully",
    data: result,
  });
});

const deleteCandidate = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await candidateServices.deleteCandidate(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Candidate deleted successfully",
    data: result,
  });
});

export const candidateControllers = {
  createCandidate,
  getAllCandidates,
  getSingleCandidate,
  updateCandidate,
  deleteCandidate,
};
