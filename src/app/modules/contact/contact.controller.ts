import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { contactServices } from "./contact.service";
import httpStatus from "http-status";

const createContact = catchAsync(async (req, res) => {
  const result = await contactServices.createContact(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Contact created successfully",
    data: result,
  });
});

const getAllContacts = catchAsync(async (req, res) => {
  const result = await contactServices.getAllContacts();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Contacts fetched successfully",
    data: result,
  });
});

const getSingleContact = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await contactServices.getSingleContact(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Contact fetched successfully",
    data: result,
  });
});

const updateContact = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await contactServices.updateContact(id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Contact updated successfully",
    data: result,
  });
});

const deleteContact = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const result = await contactServices.deleteContact(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Contact deleted successfully",
    data: result,
  });
});

export const contactControllers = {
  createContact,
  getAllContacts,
  getSingleContact,
  updateContact,
  deleteContact,
};
