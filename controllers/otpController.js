import crypto from "crypto";
import prisma from "../lib/prisma.js";
import { sendOtpEmail } from "../utils/mailer.js";

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

const generateOtp = () =>
  String(crypto.randomInt(100000, 999999));

export const sendOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  const normalised = email.toLowerCase().trim();

  // Remove any existing unused OTPs for this email
  await prisma.otp.deleteMany({ where: { email: normalised } });

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.otp.create({ data: { email: normalised, code, expiresAt } });

  try {
    await sendOtpEmail(normalised, code);
  } catch (err) {
    // Clean up if email fails so the user can retry
    await prisma.otp.deleteMany({ where: { email: normalised } });
    console.error("SMTP error:", err.message);
    return res.status(502).json({ message: "Failed to send OTP email. Please try again." });
  }

  res.json({ message: "OTP sent to " + normalised });
};

export const verifyOtp = async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ message: "Email and code are required" });

  const normalised = email.toLowerCase().trim();

  const record = await prisma.otp.findFirst({
    where: { email: normalised },
    orderBy: { createdAt: "desc" },
  });

  if (!record || record.code !== String(code).trim()) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  if (record.expiresAt < new Date()) {
    await prisma.otp.delete({ where: { id: record.id } });
    return res.status(400).json({ message: "OTP has expired" });
  }

  // Consume the OTP
  await prisma.otp.delete({ where: { id: record.id } });

  res.json({ message: "OTP verified", email: normalised });
};
