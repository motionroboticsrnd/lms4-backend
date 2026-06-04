import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { protect, allow } from "../middleware/auth.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Store file in memory so we can pipe it straight to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter(_, file, cb) {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed."));
    }
    cb(null, true);
  },
});

const router = express.Router();

router.post(
  "/",
  protect,
  allow("superadmin"),
  upload.single("file"),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file provided." });

    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY    ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      return res.status(503).json({ message: "Image upload is not configured on this server. Use a URL instead." });
    }

    try {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "lms/experiments", resource_type: "image" },
          (err, result) => (err ? reject(err) : resolve(result))
        );
        stream.end(req.file.buffer);
      });
      res.json({ url: result.secure_url });
    } catch (err) {
      console.error("Cloudinary upload error:", err.message);
      res.status(500).json({ message: "Upload failed. " + err.message });
    }
  }
);

export default router;
