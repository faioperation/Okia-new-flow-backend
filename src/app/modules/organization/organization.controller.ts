import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { organizationServices } from "./organization.service";
import httpStatus from "http-status";

const createOrganization = catchAsync(async (req, res) => {
  const result = await organizationServices.createOrganization(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Organization created successfully",
    data: result,
  });
});

const getAllOrganizations = catchAsync(async (req, res) => {
  const result = await organizationServices.getAllOrganizations();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Organizations fetched successfully",
    data: result,
  });
});

const getSingleOrganization = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await organizationServices.getSingleOrganization(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Organization fetched successfully",
    data: result,
  });
});

const updateOrganization = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await organizationServices.updateOrganization(id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Organization updated successfully",
    data: result,
  });
});

const deleteOrganization = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await organizationServices.deleteOrganization(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Organization deleted successfully",
    data: result,
  });
});

export const organizationControllers = {
  createOrganization,
  getAllOrganizations,
  getSingleOrganization,
  updateOrganization,
  deleteOrganization,
};
