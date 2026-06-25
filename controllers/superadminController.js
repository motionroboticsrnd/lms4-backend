import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";

const fmtUser = ({ password, ...u }) => ({ ...u, _id: u.id });
const fmtInst = (i) => ({ ...i, _id: i.id });

/* ─── Stats ─── */
export const getStats = async (req, res) => {
  const [institutes, users, certificates, experiments] = await Promise.all([
    prisma.institute.count(),
    prisma.user.count(),
    prisma.certificate.count(),
    prisma.experiment.count(),
  ]);
  res.json({ institutes, users, certificates, experiments });
};

/* ─── Institutes ─── */
export const getInstitutes = async (req, res) => {
  const list = await prisma.institute.findMany({ orderBy: { createdAt: "desc" } });
  res.json(list.map(fmtInst));
};

export const createInstitute = async (req, res) => {
  const { name, code, address, phone, email, allowedLevels, accessUntil } = req.body;
  if (!name || !code) return res.status(400).json({ message: "Name and code are required." });

  const exists = await prisma.institute.findUnique({ where: { code: code.toUpperCase() } });
  if (exists) return res.status(409).json({ message: `Code "${code.toUpperCase()}" is already taken.` });

  const inst = await prisma.institute.create({
    data: {
      name,
      code: code.toUpperCase(),
      address: address || "",
      phone: phone || "",
      email: email || "",
      allowedLevels: allowedLevels || [1, 2, 3, 4, 5, 6],
      accessUntil: accessUntil ? new Date(accessUntil) : null,
    },
  });
  res.status(201).json(fmtInst(inst));
};

export const updateInstitute = async (req, res) => {
  const { name, address, phone, email, allowedLevels, accessUntil } = req.body;
  try {
    const inst = await prisma.institute.update({
      where: { id: req.params.id },
      data: { name, address, phone, email, allowedLevels, accessUntil: accessUntil ? new Date(accessUntil) : null },
    });
    res.json(fmtInst(inst));
  } catch {
    res.status(404).json({ message: "Institute not found." });
  }
};

export const toggleInstitute = async (req, res) => {
  const inst = await prisma.institute.findUnique({ where: { id: req.params.id } });
  if (!inst) return res.status(404).json({ message: "Institute not found." });
  const updated = await prisma.institute.update({
    where: { id: req.params.id },
    data: { isActive: !inst.isActive },
  });
  res.json(fmtInst(updated));
};

export const deleteInstitute = async (req, res) => {
  await prisma.institute.delete({ where: { id: req.params.id } });
  res.json({ message: "Deleted." });
};

/* ─── Users ─── */
export const getUsers = async (req, res) => {
  const { role, institute } = req.query;
  const where = {};
  if (role) where.role = role;
  if (institute) where.instituteId = institute;
  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true, fullName: true, email: true, role: true,
      instituteId: true, phone: true, rollNumber: true,
      avatarColor: true, isActive: true, createdAt: true, updatedAt: true,
    },
  });
  res.json(users.map((u) => ({ ...u, _id: u.id })));
};

export const createUser = async (req, res) => {
  const { fullName, password, role, instituteId, phone, rollNumber, avatarColor } = req.body;
  let { email } = req.body;

  if (!fullName || !password || !role)
    return res.status(400).json({ message: "fullName, password and role are required." });

  // Students without emails get an auto-generated placeholder
  if (!email && role === "student") {
    const tag = rollNumber?.trim() || Math.random().toString(36).slice(2, 8);
    email = `student_${tag}_${Date.now()}@noemail.lms`;
  }

  if (!email)
    return res.status(400).json({ message: "Email is required." });

  const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (exists) return res.status(409).json({ message: "Email is already registered." });

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      fullName,
      email: email.toLowerCase(),
      password: hashed,
      role,
      instituteId: role === "superadmin" ? null : (instituteId || null),
      phone: phone || "",
      rollNumber: rollNumber || "",
      avatarColor: avatarColor || "#6366f1",
    },
  });
  res.status(201).json(fmtUser(user));
};

export const toggleUser = async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ message: "User not found." });
  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: !user.isActive },
  });
  res.json({ _id: updated.id, id: updated.id, isActive: updated.isActive });
};

export const resetUserPassword = async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6)
    return res.status(400).json({ message: "Password must be at least 6 characters." });
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ message: "User not found." });
  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { id: req.params.id }, data: { password: hashed } });
  res.json({ message: "Password reset." });
};

export const deleteUser = async (req, res) => {
  await prisma.user.delete({ where: { id: req.params.id } });
  res.json({ message: "Deleted." });
};

export const getReports = async (req, res) => {
  const [institutes, students, teachers, admins, certificates, examAttempts, exams, content] = await Promise.all([
    prisma.institute.count(),
    prisma.user.count({ where: { role: "student" } }),
    prisma.user.count({ where: { role: "teacher" } }),
    prisma.user.count({ where: { role: "admin" } }),
    prisma.certificate.count(),
    prisma.examAttempt.findMany({ select: { passed: true, score: true, totalMarks: true } }),
    prisma.exam.count(),
    prisma.content.count(),
  ]);

  const passed   = examAttempts.filter((a) => a.passed).length;
  const avgScore = examAttempts.length
    ? Math.round(examAttempts.reduce((s, a) => s + (a.score / a.totalMarks) * 100, 0) / examAttempts.length)
    : 0;

  const topInstitutes = await prisma.institute.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { users: true, classes: true } } },
  });

  res.json({
    institutes, students, teachers, admins, certificates,
    exams, content,
    examAttempts: examAttempts.length, passed,
    failed: examAttempts.length - passed, avgScore,
    topInstitutes: topInstitutes.map((i) => ({
      id: i.id, name: i.name, code: i.code, isActive: i.isActive,
      users: i._count.users, classes: i._count.classes,
    })),
  });
};

export const bulkCreateUsers = async (req, res) => {
  const { users, role, instituteId } = req.body;
  if (!Array.isArray(users) || users.length === 0)
    return res.status(400).json({ message: "users array is required." });

  const results = { created: [], skipped: [], errors: [] };

  for (const u of users) {
    try {
      const { fullName, email, password, phone, rollNumber, avatarColor } = u;
      const userRole = u.role || role || "student";
      const userInstituteId = u.instituteId || instituteId || null;
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
          role: userRole,
          instituteId: userRole === "superadmin" ? null : userInstituteId,
          phone: phone || "", rollNumber: rollNumber || "",
          avatarColor: avatarColor || "#6366f1",
        },
      });
      results.created.push(fmtUser(user));
    } catch (err) {
      results.errors.push({ email: u.email || "?", reason: err.message });
    }
  }

  res.status(207).json(results);
};
