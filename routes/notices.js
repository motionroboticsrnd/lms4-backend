import express from "express";
import { protect, allow } from "../middleware/auth.js";
import {
  getSuperAdminNotices, createSuperAdminNotice,
  getAdminNotices,      createAdminNotice,
  getTeacherNotices,    createTeacherNotice,
  getStudentNotices,
  updateNotice, deleteNotice,
} from "../controllers/noticeController.js";

const router = express.Router();

router.get("/superadmin",    protect, allow("superadmin"),            getSuperAdminNotices);
router.post("/superadmin",   protect, allow("superadmin"),            createSuperAdminNotice);

router.get("/admin",         protect, allow("admin"),                 getAdminNotices);
router.post("/admin",        protect, allow("admin"),                 createAdminNotice);

router.get("/teacher",       protect, allow("teacher"),               getTeacherNotices);
router.post("/teacher",      protect, allow("teacher"),               createTeacherNotice);

router.get("/student",       protect, allow("student"),               getStudentNotices);

router.put("/:id",           protect, allow("superadmin","admin","teacher"), updateNotice);
router.delete("/:id",        protect, allow("superadmin","admin","teacher"), deleteNotice);

export default router;
