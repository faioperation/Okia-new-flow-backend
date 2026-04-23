import { Router } from "express";
import { authControllers } from "./auth.controller";

const router = Router()

router.post("/login",authControllers.userLogin)
router.post("/register",authControllers.userRegister)
router.post("/logout",authControllers.userLogout)
router.post("/forgot-password",authControllers.userForgotPassword)  // OTP SEND
router.post("/verify-otp",authControllers.userVerifyOTP) // OTP CHECK -> Return True for successful OTP
router.post("/change-password",authControllers.userChangePassword) // Change Password


export const authRouter = router;
