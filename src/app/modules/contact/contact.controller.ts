import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { contactServices } from "./contact.service";
import httpStatus from "http-status";

const createContact = catchAsync(async (req, res) => {
  const userId = (req as any).user.id;
  const result = await contactServices.createContact(userId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Contact created successfully",
    data: result,
  });
});

const getAllContacts = catchAsync(async (req, res) => {
  const userId = (req as any).user.id;
  const result = await contactServices.getAllContacts(userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Contacts fetched successfully",
    data: result,
  });
});

const getSingleContact = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const userId = (req as any).user.id;
  const result = await contactServices.getSingleContact(id, userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Contact fetched successfully",
    data: result,
  });
});

const updateContact = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const userId = (req as any).user.id;
  const result = await contactServices.updateContact(id, userId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Contact updated successfully",
    data: result,
  });
});

const deleteContact = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const userId = (req as any).user.id;
  const result = await contactServices.deleteContact(id, userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Contact deleted successfully",
    data: result,
  });
});

const deleteAllContacts = catchAsync(async (req, res) => {
  const userId = (req as any).user.id;
  const result = await contactServices.deleteAllContacts(userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All contacts deleted successfully",
    data: result,
  });
});

export const contactControllers = {
  createContact,
  getAllContacts,
  getSingleContact,
  updateContact,
  deleteContact,
  deleteAllContacts,
};
