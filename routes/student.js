import express from "express";
import { protect, allow } from "../middleware/auth.js";
import { getStats, getClasses, getContent } from "../controllers/studentController.js";
import {
  getStudentExperiments, getStudentExperimentDetail, submitExperiment,
} from "../controllers/experimentController.js";

const router = express.Router();
router.use(protect, allow("student"));

router.get("/stats",   getStats);
router.get("/classes", getClasses);
router.get("/content", getContent);

router.get("/experiments",          getStudentExperiments);
router.get("/experiments/:id",      getStudentExperimentDetail);
router.post("/experiments/:id/submit", submitExperiment);

export default router;
