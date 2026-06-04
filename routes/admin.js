import express from "express";
import { protect, allow } from "../middleware/auth.js";
import {
  getStats, getReports,
  getClasses, createClass, updateClass, deleteClass, patchClassTeacher,
  getTeachers, createTeacher, toggleTeacher, resetTeacherPassword, deleteTeacher,
  getStudents, createStudent, toggleStudent, resetStudentPassword, deleteStudent,
  enrollStudent, unenrollStudent, bulkCreateStudents,
} from "../controllers/adminController.js";

const router = express.Router();
router.use(protect, allow("admin"));

router.get("/stats", getStats);
router.get("/reports", getReports);

router.get("/classes", getClasses);
router.post("/classes", createClass);
router.put("/classes/:id", updateClass);
router.delete("/classes/:id", deleteClass);
router.patch("/classes/:id/teachers", patchClassTeacher);

router.get("/teachers", getTeachers);
router.post("/teachers", createTeacher);
router.patch("/teachers/:id/toggle", toggleTeacher);
router.patch("/teachers/:id/reset-password", resetTeacherPassword);
router.delete("/teachers/:id", deleteTeacher);

router.get("/students", getStudents);
router.post("/students/bulk", bulkCreateStudents);
router.post("/students", createStudent);
router.patch("/students/:id/toggle", toggleStudent);
router.patch("/students/:id/reset-password", resetStudentPassword);
router.delete("/students/:id", deleteStudent);
router.post("/students/:id/enroll", enrollStudent);
router.delete("/students/:id/enroll/:classId", unenrollStudent);

export default router;
