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

export const userControllers = {
  getProfile,
  changePassword,
};
