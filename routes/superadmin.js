import express from "express";
import { protect, allow } from "../middleware/auth.js";
import {
  getStats, getReports,
  getInstitutes, createInstitute, updateInstitute, toggleInstitute, deleteInstitute,
  getUsers, createUser, toggleUser, resetUserPassword, deleteUser, bulkCreateUsers,
} from "../controllers/superadminController.js";

const router = express.Router();
router.use(protect, allow("superadmin"));

router.get("/stats", getStats);
router.get("/reports", getReports);

router.get("/institutes", getInstitutes);
router.post("/institutes", createInstitute);
router.put("/institutes/:id", updateInstitute);
router.patch("/institutes/:id/toggle", toggleInstitute);
router.delete("/institutes/:id", deleteInstitute);

router.get("/users", getUsers);
router.post("/users/bulk", bulkCreateUsers);
router.post("/users", createUser);
router.patch("/users/:id/toggle", toggleUser);
router.patch("/users/:id/reset-password", resetUserPassword);
router.delete("/users/:id", deleteUser);

export default router;
