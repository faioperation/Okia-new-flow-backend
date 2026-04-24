import { prisma } from "../../db_connection";
import bcrypt from "bcrypt";
import httpStatus from "http-status";
import ApiError from "../../errors/ApiError";
import { sendEmail } from "../../utils/sendEmail";
import crypto from "crypto";

const db = prisma as any;

const loginUser = async (payload: { email: string; password: string }) => {
  const { email, password } = payload;

  const user = await db.user.findUnique({
    where: { email },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }
  if (user.isBlocked) {
    throw new ApiError(httpStatus.FORBIDDEN, "User is blocked");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid credentials");
  }

  return user;
};

const registerUser = async (payload: {
  name: string;
  email: string;
  password: string;
  contactNo: string;
}) => {
  const result = await prisma.$transaction(async (tx) => {
    const existingUser = await tx.user.findUnique({
      where: { email: payload.email },
    });

    if (existingUser) {
      throw new ApiError(httpStatus.CONFLICT, "Email already exists");
    }

    const hashed = await bcrypt.hash(payload.password, 8);

    const user = await tx.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        password: hashed,
        contactNo: payload.contactNo,
        isBlocked: false,
      },
    });

    return user;
  });

  return result;
};

// Forget Password
const generateOtp = (length = 6) => {
  const otp = crypto.randomInt(10 ** (length - 1), 10 ** length).toString();
  return otp;
};

const forgotPassword_sendPassword = async (email: string) => {
  const isUserExist = await db.user.findUnique({
    where: { email: email },
  });

  if (!isUserExist) {
    throw new ApiError(httpStatus.BAD_REQUEST, "User does not exist");
  }

  const otp = generateOtp();

  await prisma.oTPVerification.deleteMany({
    where: { email }
  });

  await prisma.oTPVerification.create({
    data: {
      email,
      otp,
      purpose: "forgot_password",
      expiresAt: new Date(Date.now() + 2 * 60 * 1000)
    }
  });

  await sendEmail({
    to: email,
    subject: "Your OTP Code",
    tempName: "otp",
    tempData: {
      name: isUserExist.name,
      otp: otp,
    },
  });
};


// verify OTP for forgot password
const verifyOTP = async (email: string, otp: string) => {
  const user = await db.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const record = await prisma.oTPVerification.findFirst({
    where: {
      email,
      otp,
      verified: false,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!record) {
    throw new ApiError(401, "Invalid OTP");
  }

  if (record.expiresAt < new Date()) {
    throw new ApiError(401, "OTP expired");
  }

  await prisma.oTPVerification.update({
    where: { id: record.id },
    data: { verified: true },
  });

  return { isOTPValid: true };
};

const changePassword = async (newPassword: string, email: string) => {

  const user = await db.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  if (!newPassword) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "New password is not found");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await db.user.update({
    where: { email },
    data: {
      password: hashedPassword,
    },
  });

  await prisma.oTPVerification.deleteMany({
    where: { email },
  });

  return {
    success: true,
    message: "Password changed successfully",
  };
};

export const authServices = {
  loginUser,
  registerUser,
  forgotPassword_sendPassword,
  verifyOTP,
  changePassword,
};
