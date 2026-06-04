import prisma from "../lib/prisma.js";

const fmt = (n) => ({
  ...n,
  _id:         n.id,
  authorName:  n.author?.fullName  || "",
  authorRole:  n.author?.role      || "",
  className:   n.class?.name       || null,
  instituteName: n.institute?.name || null,
});

const BASE_INCLUDE = {
  author:    { select: { id: true, fullName: true, role: true, avatarColor: true } },
  class:     { select: { id: true, name: true } },
  institute: { select: { id: true, name: true } },
};

const activeFilter = { isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] };

/* ─────────── SuperAdmin ─────────── */
export const getSuperAdminNotices = async (req, res) => {
  const notices = await prisma.notice.findMany({
    include: BASE_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  res.json(notices.map(fmt));
};

export const createSuperAdminNotice = async (req, res) => {
  const { title, content, type, expiresAt } = req.body;
  if (!title || !content) return res.status(400).json({ message: "title and content are required." });
  const n = await prisma.notice.create({
    data: {
      title, content, type: type || "info",
      scope: "global",
      authorId: req.user.id,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
    include: BASE_INCLUDE,
  });
  res.status(201).json(fmt(n));
};

/* ─────────── Admin (school-level) ─────────── */
export const getAdminNotices = async (req, res) => {
  const { instituteId } = req.user;
  const notices = await prisma.notice.findMany({
    where: { instituteId },
    include: BASE_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  res.json(notices.map(fmt));
};

export const createAdminNotice = async (req, res) => {
  const { title, content, type, expiresAt } = req.body;
  const { instituteId } = req.user;
  if (!title || !content) return res.status(400).json({ message: "title and content are required." });
  if (!instituteId) return res.status(400).json({ message: "Admin must belong to an institute." });
  const n = await prisma.notice.create({
    data: {
      title, content, type: type || "info",
      scope: "institute",
      authorId: req.user.id,
      instituteId,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
    include: BASE_INCLUDE,
  });
  res.status(201).json(fmt(n));
};

/* ─────────── Teacher (class-level) ─────────── */
export const getTeacherNotices = async (req, res) => {
  const teacherId = req.user.id;
  const classTeachers = await prisma.classTeacher.findMany({
    where: { userId: teacherId },
    select: { classId: true },
  });
  const classIds = classTeachers.map((ct) => ct.classId);

  const notices = await prisma.notice.findMany({
    where: { authorId: teacherId },
    include: BASE_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  res.json(notices.map(fmt));
};

export const createTeacherNotice = async (req, res) => {
  const { title, content, type, classId, expiresAt } = req.body;
  if (!title || !content) return res.status(400).json({ message: "title and content are required." });

  if (classId) {
    const ct = await prisma.classTeacher.findUnique({
      where: { classId_userId: { classId, userId: req.user.id } },
    });
    if (!ct) return res.status(403).json({ message: "Not your class." });
  }

  const n = await prisma.notice.create({
    data: {
      title, content, type: type || "info",
      scope: "class",
      authorId: req.user.id,
      classId: classId || null,
      instituteId: req.user.instituteId || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
    include: BASE_INCLUDE,
  });
  res.status(201).json(fmt(n));
};

/* ─────────── Shared update / delete ─────────── */
export const updateNotice = async (req, res) => {
  const { title, content, type, isActive, expiresAt } = req.body;
  try {
    const existing = await prisma.notice.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: "Notice not found." });

    const isOwner   = existing.authorId === req.user.id;
    const isSuperAdmin = req.user.role === "superadmin";
    if (!isOwner && !isSuperAdmin) return res.status(403).json({ message: "Not authorised." });

    const n = await prisma.notice.update({
      where:   { id: req.params.id },
      data: {
        title, content, type,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        expiresAt: expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : undefined,
      },
      include: BASE_INCLUDE,
    });
    res.json(fmt(n));
  } catch {
    res.status(404).json({ message: "Notice not found." });
  }
};

export const deleteNotice = async (req, res) => {
  const existing = await prisma.notice.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ message: "Notice not found." });

  const isOwner      = existing.authorId === req.user.id;
  const isSuperAdmin = req.user.role === "superadmin";
  const isAdmin      = req.user.role === "admin" && existing.instituteId === req.user.instituteId;
  if (!isOwner && !isSuperAdmin && !isAdmin) return res.status(403).json({ message: "Not authorised." });

  await prisma.notice.delete({ where: { id: req.params.id } });
  res.json({ message: "Deleted." });
};

/* ─────────── Student (read-only) ─────────── */
export const getStudentNotices = async (req, res) => {
  const studentId = req.user.id;

  const enrollments = await prisma.studentEnrollment.findMany({
    where:   { studentId },
    select:  { classId: true, class: { select: { instituteId: true } } },
  });

  const classIds     = enrollments.map((e) => e.classId);
  const instituteIds = [...new Set(enrollments.map((e) => e.class.instituteId).filter(Boolean))];

  const notices = await prisma.notice.findMany({
    where: {
      ...activeFilter,
      OR: [
        { scope: "global" },
        { scope: "institute", instituteId: { in: instituteIds } },
        { scope: "class",     classId:     { in: classIds }     },
      ],
    },
    include: BASE_INCLUDE,
    orderBy: { createdAt: "desc" },
  });

  res.json(notices.map(fmt));
};
