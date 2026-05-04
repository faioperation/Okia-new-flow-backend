import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { userServices } from "./user.service";
import httpStatus from "http-status";

const getProfile = catchAsync(async (req, res) => {
  const user = (req as any).user;
  const result = await userServices.getProfile(user.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile fetched successfully",
    data: result,
  });
});

const changePassword = catchAsync(async (req, res) => {
  const user = (req as any).user;
  await userServices.changePassword(user.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Password changed successfully",
    data: null,
  });
});

const updateProfile = catchAsync(async (req, res) => {
  const user = (req as any).user;
  const { firstName, lastName, gender, country } = req.body;
  const profilePicture = req.file ? `/uploads/profile/${req.file.filename}` : undefined;

  const payload: any = {};
  if (firstName) payload.firstName = firstName;
  if (lastName) payload.lastName = lastName;
  if (gender) payload.gender = gender;
  if (country) payload.country = country;
  if (profilePicture) payload.profilePicture = profilePicture;

  const result = await userServices.updateProfile(user.id, payload);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile updated successfully",
    data: result,
  });
});

export const userControllers = {
  getProfile,
  changePassword,
  updateProfile,
};
