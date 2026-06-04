import express from "express";
import { protect, allow } from "../middleware/auth.js";
import { getContent, createContent, updateContent, deleteContent, getContentByLevel } from "../controllers/contentController.js";

const router = express.Router();

router.get("/", protect, allow("superadmin"), getContent);
router.post("/", protect, allow("superadmin"), createContent);
router.put("/:id", protect, allow("superadmin"), updateContent);
router.delete("/:id", protect, allow("superadmin"), deleteContent);

router.get("/level/:level", protect, allow("teacher", "student", "admin", "superadmin"), getContentByLevel);

export default router;
