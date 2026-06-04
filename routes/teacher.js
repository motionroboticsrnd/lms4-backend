import express from "express";
import { protect, allow } from "../middleware/auth.js";
import { getStats, getClasses, getContent, getReports } from "../controllers/teacherController.js";
import {
  getTeacherExperiments, getTeacherSubmissions, getExperimentSubmissions,
  unlockExperiment, lockExperiment, reviewSubmission,
} from "../controllers/experimentController.js";

const router = express.Router();
router.use(protect, allow("teacher"));

router.get("/stats",   getStats);
router.get("/reports", getReports);
router.get("/classes", getClasses);
router.get("/content", getContent);

router.get("/experiments",                              getTeacherExperiments);
router.get("/experiments/submissions",                  getTeacherSubmissions);
router.get("/experiments/:expId/submissions",           getExperimentSubmissions);
router.post("/experiments/:id/unlock",                unlockExperiment);
router.post("/experiments/:id/lock",                  lockExperiment);
router.post("/experiments/submissions/:submissionId/review", reviewSubmission);

export default router;
