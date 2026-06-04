import prisma from "../lib/prisma.js";

export const getStats = async (req, res) => {
  const teacherId = req.user.id;

  const classTeachers = await prisma.classTeacher.findMany({
    where: { userId: teacherId },
    include: { class: { include: { enrollments: true } } },
  });

  const classes  = classTeachers.length;
  const students = new Set(
    classTeachers.flatMap((ct) => ct.class.enrollments.map((e) => e.studentId))
  ).size;

  res.json({ classes, students, pending: 0, approved: 0 });
};

export const getClasses = async (req, res) => {
  const teacherId = req.user.id;

  const classTeachers = await prisma.classTeacher.findMany({
    where: { userId: teacherId },
    include: {
      class: {
        include: {
          institute: { select: { id: true, name: true, code: true } },
          enrollments: {
            include: {
              student: {
                select: { id: true, fullName: true, email: true, rollNumber: true, avatarColor: true },
              },
            },
          },
          teachers: {
            include: {
              user: { select: { id: true, fullName: true, email: true, avatarColor: true } },
            },
          },
        },
      },
    },
    orderBy: { class: { createdAt: "desc" } },
  });

  const classes = classTeachers.map(({ class: c }) => ({
    _id:           c.id,
    id:            c.id,
    name:          c.name,
    roboticsLevel: c.roboticsLevel,
    institute:     { ...c.institute, _id: c.institute.id },
    students:      c.enrollments.map((e) => ({ ...e.student, _id: e.student.id })),
    teacherIds:    c.teachers.map((t) => ({ ...t.user, _id: t.user.id })),
  }));

  res.json(classes);
};

export const getReports = async (req, res) => {
  const teacherId = req.user.id;

  const classTeachers = await prisma.classTeacher.findMany({
    where: { userId: teacherId },
    include: {
      class: {
        include: {
          enrollments: { select: { studentId: true } },
          examUnlocks: {
            include: {
              exam: { include: { attempts: { select: { passed: true, score: true, totalMarks: true, studentId: true } } } },
            },
          },
        },
      },
    },
  });

  const classes = classTeachers.map(({ class: c }) => {
    const allAttempts = c.examUnlocks.flatMap((u) => u.exam.attempts);
    const passed  = allAttempts.filter((a) => a.passed).length;
    const avgScore = allAttempts.length
      ? Math.round(allAttempts.reduce((s, a) => s + (a.score / a.totalMarks) * 100, 0) / allAttempts.length)
      : 0;
    return {
      id: c.id, name: c.name, roboticsLevel: c.roboticsLevel,
      studentCount: c.enrollments.length,
      examsUnlocked: c.examUnlocks.length,
      totalAttempts: allAttempts.length,
      passed, failed: allAttempts.length - passed,
      avgScore,
    };
  });

  const totalStudents = new Set(
    classTeachers.flatMap((ct) => ct.class.enrollments.map((e) => e.studentId))
  ).size;

  res.json({ classes, totalStudents, totalClasses: classTeachers.length });
};

export const getContent = async (req, res) => {
  const teacherId = req.user.id;

  const classTeachers = await prisma.classTeacher.findMany({
    where: { userId: teacherId },
    include: { class: { select: { roboticsLevel: true } } },
  });

  const levels = [...new Set(classTeachers.map((ct) => ct.class.roboticsLevel))];
  if (levels.length === 0) return res.json([]);

  const content = await prisma.content.findMany({
    where: { roboticsLevel: { in: levels } },
    orderBy: [{ roboticsLevel: "asc" }, { type: "asc" }],
  });

  res.json(content.map((c) => ({ ...c, _id: c.id })));
};
