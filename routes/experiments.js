import express from "express";
import { protect, allow } from "../middleware/auth.js";
import {
  getAllExperiments, createExperiment, updateExperiment, deleteExperiment, bulkCreateExperiments,
} from "../controllers/experimentController.js";

const router = express.Router();

// SuperAdmin — full CRUD
router.get("/",        protect, allow("superadmin"), getAllExperiments);
router.post("/bulk",   protect, allow("superadmin"), bulkCreateExperiments);
router.post("/",       protect, allow("superadmin"), createExperiment);
router.put("/:id",     protect, allow("superadmin"), updateExperiment);
router.delete("/:id",  protect, allow("superadmin"), deleteExperiment);

export default router;
