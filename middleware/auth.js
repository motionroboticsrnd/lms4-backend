import jwt from "jsonwebtoken";
import prisma, { dbQuery } from "../lib/prisma.js";

export const protect = async (req, res, next) => {
  const token = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.split(" ")[1]
    : null;

  if (!token) return res.status(401).json({ message: "Not authenticated" });

  // Step 1: verify JWT signature/expiry — pure CPU, no DB.
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  // Step 2: confirm the user still exists in the DB.
  // Kept separate so a transient DB error returns 503 (Service Unavailable)
  // instead of 401 — preventing the client from logging the user out when
  // the database is temporarily unreachable.
  try {
    const user = await dbQuery(() => prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true, fullName: true, email: true, role: true,
        instituteId: true, phone: true, rollNumber: true,
        avatarColor: true, isActive: true, createdAt: true, updatedAt: true,
      },
    }));

    if (!user || !user.isActive)
      return res.status(401).json({ message: "User not found or inactive" });

    req.user = { ...user, _id: user.id };
    next();
  } catch (dbErr) {
    console.error("protect middleware DB error:", dbErr.message);
    res.status(503).json({ message: "Service temporarily unavailable" });
  }
};

export const allow = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ message: "Access denied" });
  next();
};
