import express from "express";
import { authController } from "../controllers";
import { verifyToken } from "../helper";

const router = express.Router();

router.post("/register", authController.registerUser);
router.post("/register-admin", authController.registerAdmin);
router.post("/login", authController.loginUser);
router.post("/forgot-password", authController.forgotPassword);
router.post("/send-otp", authController.sendOtp);
router.post("/verify-otp", authController.verifyOtp);
router.post("/reset-password", authController.resetPassword);
router.post("/logout", authController.logoutUser);

router.use(verifyToken);
router.post("/change-password", authController.changePassword);

export default router;