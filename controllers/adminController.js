import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";

const iid = (req) => req.user.instituteId;

const fmtUser = ({ password, ...u }) => ({ ...u, _id: u.id });


const fmtClass = (c) => ({
  _id:           c.id,
  id:            c.id,
  name:          c.name,
  roboticsLevel: c.roboticsLevel,
  instituteId:   c.instituteId,
  createdAt:     c.createdAt,
  updatedAt:     c.updatedAt,
  teacherIds:    (c.teachers || []).map((t) => ({ ...t.user, _id: t.user.id })),
  enrollments:   (c.enrollments || []),
});

const teacherInclude = {
  teachers: {
    include: {
      user: {
        select: { id: true, fullName: true, email: true, avatarColor: true },
      },
    },
  },
  enrollments: {
    select: { studentId: true },
  },
};

/* ─── Stats ─── */
export const getStats = async (req, res) => {
  const [classes, teachers, students] = await Promise.all([
    prisma.class.count({ where: { instituteId: iid(req) } }),
    prisma.user.count({ where: { instituteId: iid(req), role: "teacher" } }),
    prisma.user.count({ where: { instituteId: iid(req), role: "student" } }),
  ]);
  res.json({ classes, teachers, students, exams: 0 });
};

/* ─── Classes ─── */
export const getClasses = async (req, res) => {
  const classes = await prisma.class.findMany({
    where: { instituteId: iid(req) },
    include: teacherInclude,
    orderBy: { createdAt: "desc" },
  });
  res.json(classes.map(fmtClass));
};

export const createClass = async (req, res) => {
  const { name, roboticsLevel } = req.body;
  if (!name || !roboticsLevel)
    return res.status(400).json({ message: "Name and roboticsLevel required." });
  const cls = await prisma.class.create({
    data: { name, roboticsLevel: Number(roboticsLevel), instituteId: iid(req) },
    include: teacherInclude,
  });
  res.status(201).json(fmtClass(cls));
};

export const updateClass = async (req, res) => {
  const { name, roboticsLevel } = req.body;
  try {
    const cls = await prisma.class.update({
      where: { id: req.params.id, instituteId: iid(req) },
      data: { name, roboticsLevel: Number(roboticsLevel) },
      include: teacherInclude,
    });
    res.json(fmtClass(cls));
  } catch {
    res.status(404).json({ message: "Class not found." });
  }
};

export const deleteClass = async (req, res) => {
  await prisma.class.deleteMany({ where: { id: req.params.id, instituteId: iid(req) } });
  res.json({ message: "Deleted." });
};

export const patchClassTeacher = async (req, res) => {
  const { teacherId, action } = req.body;
  const cls = await prisma.class.findFirst({ where: { id: req.params.id, instituteId: iid(req) } });
  if (!cls) return res.status(404).json({ message: "Class not found." });

  if (action === "add") {
    await prisma.classTeacher.upsert({
      where: { classId_userId: { classId: req.params.id, userId: teacherId } },
      create: { classId: req.params.id, userId: teacherId },
      update: {},
    });
  } else {
    await prisma.classTeacher.deleteMany({ where: { classId: req.params.id, userId: teacherId } });
  }

  const updated = await prisma.class.findUnique({ where: { id: req.params.id }, include: teacherInclude });
  res.json(fmtClass(updated));
};

/* ─── Teachers ─── */
export const getTeachers = async (req, res) => {
  const teachers = await prisma.user.findMany({
    where: { instituteId: iid(req), role: "teacher" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, fullName: true, email: true, role: true,
      instituteId: true, phone: true, avatarColor: true,
      isActive: true, createdAt: true, updatedAt: true,
    },
  });
  res.json(teachers.map((u) => ({ ...u, _id: u.id })));
};

export const createTeacher = async (req, res) => {
  const { fullName, email, password, phone, avatarColor } = req.body;
  if (!fullName || !email || !password)
    return res.status(400).json({ message: "fullName, email and password required." });
  const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (exists) return res.status(409).json({ message: "Email already registered." });
  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      fullName, email: email.toLowerCase(), password: hashed,
      phone: phone || "", role: "teacher",
      instituteId: iid(req), avatarColor: avatarColor || "#3b82f6",
    },
  });
  res.status(201).json(fmtUser(user));
};

export const toggleTeacher = async (req, res) => {
  const user = await prisma.user.findFirst({
    where: { id: req.params.id, instituteId: iid(req), role: "teacher" },
  });
  if (!user) return res.status(404).json({ message: "Teacher not found." });
  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: !user.isActive },
  });
  res.json({ _id: updated.id, id: updated.id, isActive: updated.isActive });
};

export const resetTeacherPassword = async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6)
    return res.status(400).json({ message: "Password must be at least 6 characters." });
  const user = await prisma.user.findFirst({
    where: { id: req.params.id, instituteId: iid(req), role: "teacher" },
  });
  if (!user) return res.status(404).json({ message: "Teacher not found." });
  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { id: req.params.id }, data: { password: hashed } });
  res.json({ message: "Password reset." });
};

export const deleteTeacher = async (req, res) => {
  await prisma.user.deleteMany({ where: { id: req.params.id, instituteId: iid(req), role: "teacher" } });
  res.json({ message: "Deleted." });
};

/* ─── Students ─── */
export const getStudents = async (req, res) => {
  const students = await prisma.user.findMany({
    where: { instituteId: iid(req), role: "student" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, fullName: true, email: true, role: true,
      instituteId: true, phone: true, rollNumber: true,
      avatarColor: true, isActive: true, createdAt: true, updatedAt: true,
    },
  });
  res.json(students.map((u) => ({ ...u, _id: u.id })));
};

export const createStudent = async (req, res) => {
  const { fullName, email, password, phone, rollNumber, avatarColor } = req.body;
  if (!fullName || !email || !password)
    return res.status(400).json({ message: "fullName, email and password required." });
  const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (exists) return res.status(409).json({ message: "Email already registered." });
  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      fullName, email: email.toLowerCase(), password: hashed,
      phone: phone || "", rollNumber: rollNumber || "",
      role: "student", instituteId: iid(req),
      avatarColor: avatarColor || "#16a34a",
    },
  });
  res.status(201).json(fmtUser(user));
};

export const toggleStudent = async (req, res) => {
  const user = await prisma.user.findFirst({
    where: { id: req.params.id, instituteId: iid(req), role: "student" },
  });
  if (!user) return res.status(404).json({ message: "Student not found." });
  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: !user.isActive },
  });
  res.json({ _id: updated.id, id: updated.id, isActive: updated.isActive });
};

export const resetStudentPassword = async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6)
    return res.status(400).json({ message: "Password must be at least 6 characters." });
  const user = await prisma.user.findFirst({
    where: { id: req.params.id, instituteId: iid(req), role: "student" },
  });
  if (!user) return res.status(404).json({ message: "Student not found." });
  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { id: req.params.id }, data: { password: hashed } });
  res.json({ message: "Password reset." });
};

export const deleteStudent = async (req, res) => {
  await prisma.user.deleteMany({ where: { id: req.params.id, instituteId: iid(req), role: "student" } });
  res.json({ message: "Deleted." });
};

export const enrollStudent = async (req, res) => {
  const { classId } = req.body;
  const cls = await prisma.class.findFirst({ where: { id: classId, instituteId: iid(req) } });
  if (!cls) return res.status(404).json({ message: "Class not found." });
  await prisma.studentEnrollment.upsert({
    where: { studentId_classId: { studentId: req.params.id, classId } },
    create: { studentId: req.params.id, classId, instituteId: iid(req) },
    update: {},
  });
  res.json({ message: "Enrolled." });
};

export const unenrollStudent = async (req, res) => {
  await prisma.studentEnrollment.deleteMany({
    where: { studentId: req.params.id, classId: req.params.classId },
  });
  res.json({ message: "Removed." });
};

export const getReports = async (req, res) => {
  const institute = iid(req);
  const [classes, teachers, students, enrollments, certificates, examAttempts] = await Promise.all([
    prisma.class.findMany({ where: { instituteId: institute }, include: { enrollments: { select: { studentId: true } } } }),
    prisma.user.count({ where: { instituteId: institute, role: "teacher" } }),
    prisma.user.count({ where: { instituteId: institute, role: "student" } }),
    prisma.studentEnrollment.count({ where: { instituteId: institute } }),
    prisma.certificate.count({ where: { student: { instituteId: institute } } }),
    prisma.examAttempt.findMany({
      where: { student: { instituteId: institute } },
      select: { passed: true, score: true, totalMarks: true },
    }),
  ]);

  const passed  = examAttempts.filter((a) => a.passed).length;
  const failed  = examAttempts.length - passed;
  const avgScore = examAttempts.length
    ? Math.round(examAttempts.reduce((s, a) => s + (a.score / a.totalMarks) * 100, 0) / examAttempts.length)
    : 0;

  res.json({
    classes: classes.length,
    teachers,
    students,
    enrollments,
    certificates,
    examAttempts: examAttempts.length,
    passed,
    failed,
    avgScore,
    classBreakdown: classes.map((c) => ({
      id: c.id, name: c.name, roboticsLevel: c.roboticsLevel,
      studentCount: c.enrollments.length,
    })),
  });
};

export const bulkCreateStudents = async (req, res) => {
  const { students } = req.body;
  if (!Array.isArray(students) || students.length === 0)
    return res.status(400).json({ message: "students array is required." });

  const results = { created: [], skipped: [], errors: [] };

  for (const s of students) {
    try {
      const { fullName, email, password, phone, rollNumber, avatarColor } = s;
      if (!fullName || !email || !password) {
        results.skipped.push({ email: email || "?", reason: "Missing required fields" });
        continue;
      }
      const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (exists) {
        results.skipped.push({ email, reason: "Email already registered" });
        continue;
      }
      const hashed = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: {
          fullName, email: email.toLowerCase(), password: hashed,
          phone: phone || "", rollNumber: rollNumber || "",
          role: "student", instituteId: iid(req),
          avatarColor: avatarColor || "#16a34a",
        },
      });
      results.created.push(fmtUser(user));
    } catch (err) {
      results.errors.push({ email: s.email || "?", reason: err.message });
    }
  }

  res.status(207).json(results);
};
