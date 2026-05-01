import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { organizationServices } from "./organization.service";
import httpStatus from "http-status";

const createOrganization = catchAsync(async (req, res) => {
  const userId = (req as any).user.id;
  const result = await organizationServices.createOrganization(userId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Organization created successfully",
    data: result,
  });
});

const getAllOrganizations = catchAsync(async (req, res) => {
  const userId = (req as any).user.id;
  const result = await organizationServices.getAllOrganizations(userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Organizations fetched successfully",
    data: result,
  });
});

const getSingleOrganization = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const userId = (req as any).user.id;
  const result = await organizationServices.getSingleOrganization(id, userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Organization fetched successfully",
    data: result,
  });
});

const updateOrganization = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const userId = (req as any).user.id;
  const result = await organizationServices.updateOrganization(id, userId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Organization updated successfully",
    data: result,
  });
});

const deleteOrganization = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const userId = (req as any).user.id;
  const result = await organizationServices.deleteOrganization(id, userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Organization deleted successfully",
    data: result,
  });
});

const deleteAllOrganizations = catchAsync(async (req, res) => {
  const userId = (req as any).user.id;
  const result = await organizationServices.deleteAllOrganizations(userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All organizations deleted successfully",
    data: result,
  });
});

export const organizationControllers = {
  createOrganization,
  getAllOrganizations,
  getSingleOrganization,
  updateOrganization,
  deleteOrganization,
  deleteAllOrganizations,
};
