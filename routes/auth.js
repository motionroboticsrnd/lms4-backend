import express from "express";
import { protect } from "../middleware/auth.js";
import { login, getMe, changePassword } from "../controllers/authController.js";
import { sendOtp, verifyOtp } from "../controllers/otpController.js";

const router = express.Router();

router.post("/login", login);
router.get("/me", protect, getMe);
router.post("/change-password", protect, changePassword);

router.post("/otp/send", sendOtp);
router.post("/otp/verify", verifyOtp);

export default router;
