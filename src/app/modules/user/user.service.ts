import { prisma } from "../../db_connection";
import ApiError from "../../errors/ApiError";
import httpStatus from "http-status";
import bcrypt from "bcrypt";

const getProfile = async (id: string) => {
  const result = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      profilePicture: true,
      contactNo: true,
      gender: true,
      country: true,
      isBlocked: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  return result;
};

const changePassword = async (id: string, payload: any) => {
  const { oldPassword, newPassword } = payload;

  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const isPasswordMatch = await bcrypt.compare(oldPassword, user.password);

  if (!isPasswordMatch) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Old password does not match");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id },
    data: {
      password: hashedPassword,
    },
  });

  return null;
};

const updateProfile = async (id: string, payload: any) => {
  const result = await prisma.user.update({
    where: { id },
    data: payload,
  });

  return result;
};

export const userServices = {
  getProfile,
  changePassword,
  updateProfile,
};
