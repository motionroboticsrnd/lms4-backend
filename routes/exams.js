import express from "express";
import { protect, allow } from "../middleware/auth.js";
import {
  getExams, createExam, updateExam, deleteExam,
  getQuestions, createQuestion, updateQuestion, deleteQuestion, bulkCreateQuestions,
  getTeacherExams, unlockExam, lockExam, getExamResults,
  getStudentExams, getStudentExamQuestions, submitExamAttempt, getStudentAttempts,
} from "../controllers/examController.js";

const router = express.Router();

/* ─── SuperAdmin ─── */
router.get("/", protect, allow("superadmin"), getExams);
router.post("/", protect, allow("superadmin"), createExam);
router.put("/:id", protect, allow("superadmin"), updateExam);
router.delete("/:id", protect, allow("superadmin"), deleteExam);

router.get("/:id/questions",         protect, allow("superadmin", "teacher"), getQuestions);
router.post("/:id/questions/bulk",   protect, allow("superadmin"), bulkCreateQuestions);
router.post("/:id/questions",        protect, allow("superadmin"), createQuestion);
router.put("/:id/questions/:qid",    protect, allow("superadmin"), updateQuestion);
router.delete("/:id/questions/:qid", protect, allow("superadmin"), deleteQuestion);

/* ─── Teacher ─── */
router.get("/teacher/list", protect, allow("teacher"), getTeacherExams);
router.post("/teacher/unlock", protect, allow("teacher"), unlockExam);
router.delete("/teacher/unlock/:examId/:classId", protect, allow("teacher"), lockExam);
router.get("/teacher/results/:examId", protect, allow("teacher"), getExamResults);

/* ─── Student ─── */
router.get("/student/list", protect, allow("student"), getStudentExams);
router.get("/student/:examId/questions", protect, allow("student"), getStudentExamQuestions);
router.post("/student/:examId/attempt", protect, allow("student"), submitExamAttempt);
router.get("/student/:examId/attempts", protect, allow("student"), getStudentAttempts);

export default router;
