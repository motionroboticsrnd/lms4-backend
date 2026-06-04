import prisma, { dbQuery } from "../lib/prisma.js";

const fmt = (e) => ({ ...e, _id: e.id });

/* ─── SuperAdmin CRUD ─── */
export const getAllExperiments = async (req, res) => {
  const { level } = req.query;
  const where = {};
  if (level) where.roboticsLevel = Number(level);
  const list = await prisma.experiment.findMany({ where, orderBy: [{ roboticsLevel: "asc" }, { expNumber: "asc" }] });
  res.json(list.map(fmt));
};

export const createExperiment = async (req, res) => {
  const { title, description, objectives, roboticsLevel, expNumber, category, duration, videoUrl, url, components, steps, diagrams } = req.body;
  if (!title || !roboticsLevel) return res.status(400).json({ message: "title and roboticsLevel are required." });
  const item = await prisma.experiment.create({
    data: {
      title,
      description:   description  || "",
      objectives:    objectives   || "",
      roboticsLevel: Number(roboticsLevel),
      expNumber:     expNumber ? Number(expNumber) : 0,
      category:      category  || "Practical",
      duration:      duration  ? Number(duration) : 30,
      videoUrl:      videoUrl  || "",
      url:           url       || "",
      components:    components || [],
      steps:         steps     || [],
      diagrams:      diagrams  || [],
    },
  });
  res.status(201).json(fmt(item));
};

export const updateExperiment = async (req, res) => {
  const { title, description, objectives, roboticsLevel, expNumber, category, duration, videoUrl, url, components, steps, diagrams, isActive } = req.body;
  try {
    const item = await prisma.experiment.update({
      where: { id: req.params.id },
      data: {
        title, description, objectives,
        roboticsLevel: roboticsLevel !== undefined ? Number(roboticsLevel) : undefined,
        expNumber:     expNumber     !== undefined ? Number(expNumber)     : undefined,
        category, duration: duration !== undefined ? Number(duration) : undefined,
        videoUrl, url, components, steps, diagrams,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
    });
    res.json(fmt(item));
  } catch {
    res.status(404).json({ message: "Experiment not found." });
  }
};

export const deleteExperiment = async (req, res) => {
  try {
    await prisma.experiment.delete({ where: { id: req.params.id } });
    res.json({ message: "Deleted." });
  } catch {
    res.status(404).json({ message: "Experiment not found." });
  }
};

export const bulkCreateExperiments = async (req, res) => {
  const rows = req.body;
  if (!Array.isArray(rows) || rows.length === 0)
    return res.status(400).json({ message: "Send an array of experiments." });

  const results = { created: 0, skipped: 0, errors: [] };
  for (const row of rows) {
    const { title, roboticsLevel } = row;
    if (!title || !roboticsLevel) {
      results.skipped++;
      results.errors.push(`Skipped row — missing title or roboticsLevel: "${title}"`);
      continue;
    }
    try {
      await prisma.experiment.create({
        data: {
          title,
          description:   row.description  || "",
          objectives:    row.objectives   || "",
          roboticsLevel: Number(roboticsLevel),
          expNumber:     row.expNumber ? Number(row.expNumber) : 0,
          category:      row.category  || "Practical",
          duration:      row.duration  ? Number(row.duration)  : 30,
          videoUrl:      row.videoUrl  || "",
          url:           row.url       || "",
          components:    row.components || [],
          steps:         row.steps     || [],
          diagrams:      row.diagrams  || [],
        },
      });
      results.created++;
    } catch (err) {
      results.skipped++;
      results.errors.push(`"${title}": ${err.message}`);
    }
  }
  res.status(201).json(results);
};

/* ─── Teacher: unlock / lock ─── */
export const unlockExperiment = async (req, res) => {
  const { classId } = req.body;
  const experimentId = req.params.id;
  const teacherId = req.user.id;

  if (!classId) return res.status(400).json({ message: "classId is required." });

  // Verify teacher owns this class
  const ct = await prisma.classTeacher.findUnique({ where: { classId_userId: { classId, userId: teacherId } } });
  if (!ct) return res.status(403).json({ message: "Not your class." });

  const unlock = await prisma.experimentUnlock.upsert({
    where:  { classId_experimentId: { classId, experimentId } },
    create: { classId, experimentId, unlockedById: teacherId },
    update: { unlockedAt: new Date(), unlockedById: teacherId },
  });
  res.json(unlock);
};

export const lockExperiment = async (req, res) => {
  const { classId } = req.body;
  const experimentId = req.params.id;
  const teacherId = req.user.id;

  if (!classId) return res.status(400).json({ message: "classId is required." });

  const ct = await prisma.classTeacher.findUnique({ where: { classId_userId: { classId, userId: teacherId } } });
  if (!ct) return res.status(403).json({ message: "Not your class." });

  try {
    await prisma.experimentUnlock.delete({ where: { classId_experimentId: { classId, experimentId } } });
    res.json({ message: "Locked." });
  } catch {
    res.status(404).json({ message: "Unlock record not found." });
  }
};

/* ─── Teacher: approve / reject submission ─── */
export const reviewSubmission = async (req, res) => {
  const { status, reviewNotes } = req.body; // status: "approved" | "rejected"
  const teacherId = req.user.id;
  try {
    const sub = await prisma.experimentSubmission.update({
      where: { id: req.params.submissionId },
      data: { status, reviewNotes: reviewNotes || "", reviewedAt: new Date(), reviewedById: teacherId },
    });
    res.json(sub);
  } catch {
    res.status(404).json({ message: "Submission not found." });
  }
};

/* ─── Teacher: list experiments for their classes ─── */
export const getTeacherExperiments = async (req, res) => {
  const teacherId = req.user.id;
  try {
    const classTeachers = await dbQuery(() => prisma.classTeacher.findMany({
      where: { userId: teacherId },
      include: {
        class: {
          include: {
            expUnlocks: { include: { experiment: true } },
            enrollments: { select: { studentId: true } },
          },
        },
      },
    }));

    if (classTeachers.length === 0) return res.json({ classes: [], experiments: [] });

    const levels = [...new Set(classTeachers.map((ct) => ct.class.roboticsLevel))];
    const experiments = await dbQuery(() => prisma.experiment.findMany({
      where:   { roboticsLevel: { in: levels }, isActive: true },
      orderBy: [{ roboticsLevel: "asc" }, { expNumber: "asc" }],
      include: {
        unlocks: { include: { class: { select: { id: true, name: true } } } },
        submissions: { select: { id: true, status: true, studentId: true, classId: true } },
      },
    }));

    const classes = classTeachers.map(({ class: c }) => ({
      id: c.id, name: c.name, roboticsLevel: c.roboticsLevel,
      studentCount: c.enrollments.length,
      unlockedExpIds: c.expUnlocks.map((u) => u.experimentId),
    }));

    res.json({
      classes,
      experiments: experiments.map((e) => ({ ...fmt(e), unlocks: e.unlocks, submissions: e.submissions })),
    });
  } catch (err) {
    console.error("getTeacherExperiments:", err.message);
    res.status(500).json({ message: "Failed to load experiments." });
  }
};

/* ─── Teacher: all submissions for one specific experiment ─── */
export const getExperimentSubmissions = async (req, res) => {
  const teacherId   = req.user.id;
  const { expId }   = req.params;
  try {
    // Verify teacher owns at least one class that has this experiment unlocked
    const classTeachers = await dbQuery(() => prisma.classTeacher.findMany({
      where:  { userId: teacherId },
      select: { classId: true },
    }));
    const classIds = classTeachers.map((ct) => ct.classId);

    const submissions = await dbQuery(() => prisma.experimentSubmission.findMany({
      where:   { experimentId: expId, classId: { in: classIds } },
      include: {
        student: { select: { id: true, fullName: true, rollNumber: true, avatarColor: true } },
        class:   { select: { id: true, name: true } },
      },
      orderBy: { submittedAt: "desc" },
    }));

    res.json(submissions.map((s) => ({ ...s, _id: s.id })));
  } catch (err) {
    console.error("getExperimentSubmissions:", err.message);
    res.status(500).json({ message: "Failed to load submissions." });
  }
};

/* ─── Teacher: pending submissions for their classes ─── */
export const getTeacherSubmissions = async (req, res) => {
  const teacherId = req.user.id;
  try {
    const classTeachers = await dbQuery(() => prisma.classTeacher.findMany({
      where:  { userId: teacherId },
      select: { classId: true },
    }));
    const classIds = classTeachers.map((ct) => ct.classId);

    const submissions = await dbQuery(() => prisma.experimentSubmission.findMany({
      where:   { classId: { in: classIds }, status: "pending" },
      include: {
        experiment: { select: { id: true, title: true, expNumber: true } },
        student:    { select: { id: true, fullName: true, rollNumber: true, avatarColor: true } },
        class:      { select: { id: true, name: true } },
      },
      orderBy: { submittedAt: "asc" },
    }));

    res.json(submissions.map((s) => ({ ...s, _id: s.id })));
  } catch (err) {
    console.error("getTeacherSubmissions:", err.message);
    res.status(500).json({ message: "Failed to load submissions." });
  }
};

/* ─── Student: get experiments for their class ─── */
export const getStudentExperiments = async (req, res) => {
  const studentId = req.user.id;

  const enrollments = await prisma.studentEnrollment.findMany({
    where:   { studentId },
    include: {
      class: {
        include: {
          expUnlocks: { select: { experimentId: true, unlockedAt: true } },
        },
      },
    },
  });

  if (enrollments.length === 0) return res.json({ level: null, experiments: [], stats: { approved: 0, pending: 0, remaining: 0, total: 0 } });

  // Take primary class (first enrollment)
  const enrollment = enrollments[0];
  const cls = enrollment.class;
  const level = cls.roboticsLevel;
  const unlockedIds = new Set(cls.expUnlocks.map((u) => u.experimentId));
  const unlockDates = Object.fromEntries(cls.expUnlocks.map((u) => [u.experimentId, u.unlockedAt]));

  const [allExperiments, submissions] = await Promise.all([
    prisma.experiment.findMany({
      where:   { roboticsLevel: level, isActive: true },
      orderBy: [{ expNumber: "asc" }],
    }),
    prisma.experimentSubmission.findMany({
      where:   { studentId, classId: cls.id },
    }),
  ]);

  const subMap = Object.fromEntries(submissions.map((s) => [s.experimentId, s]));

  const experiments = allExperiments.map((e) => {
    const unlocked = unlockedIds.has(e.id);
    const sub = subMap[e.id];
    let status = "locked";
    if (unlocked && !sub) status = "available";
    else if (sub?.status === "pending")  status = "pending";
    else if (sub?.status === "approved") status = "approved";
    else if (sub?.status === "rejected") status = "rejected";
    return { ...fmt(e), unlocked, status, unlockedAt: unlockDates[e.id] || null, submission: sub || null };
  });

  const approved  = experiments.filter((e) => e.status === "approved").length;
  const pending   = experiments.filter((e) => e.status === "pending").length;
  const total     = experiments.length;
  const remaining = total - approved - pending;

  res.json({
    classId: cls.id,
    className: cls.name,
    level,
    experiments,
    stats: { approved, pending, remaining, total },
  });
};

/* ─── Student: get single experiment detail ─── */
export const getStudentExperimentDetail = async (req, res) => {
  const studentId = req.user.id;
  const { id } = req.params;

  const experiment = await prisma.experiment.findUnique({ where: { id } });
  if (!experiment) return res.status(404).json({ message: "Not found." });

  // Get student's class for this experiment's level
  const enrollment = await prisma.studentEnrollment.findFirst({
    where: { studentId, class: { roboticsLevel: experiment.roboticsLevel } },
    include: { class: { include: { expUnlocks: { where: { experimentId: id } } } } },
  });

  const unlocked = enrollment?.class?.expUnlocks?.length > 0;
  const submission = enrollment
    ? await prisma.experimentSubmission.findUnique({
        where: { experimentId_studentId: { experimentId: id, studentId } },
      })
    : null;

  res.json({ ...fmt(experiment), unlocked, submission: submission || null, classId: enrollment?.class?.id || null });
};

/* ─── Student: submit experiment ─── */
export const submitExperiment = async (req, res) => {
  const studentId = req.user.id;
  const { notes } = req.body;
  const experimentId = req.params.id;

  // Find enrollment to get classId
  const experiment = await prisma.experiment.findUnique({ where: { id: experimentId }, select: { roboticsLevel: true } });
  if (!experiment) return res.status(404).json({ message: "Not found." });

  const enrollment = await prisma.studentEnrollment.findFirst({
    where: { studentId, class: { roboticsLevel: experiment.roboticsLevel } },
    select: { classId: true },
  });
  if (!enrollment) return res.status(403).json({ message: "Not enrolled." });

  // Check experiment is unlocked
  const unlock = await prisma.experimentUnlock.findUnique({
    where: { classId_experimentId: { classId: enrollment.classId, experimentId } },
  });
  if (!unlock) return res.status(403).json({ message: "Experiment is locked." });

  const submission = await prisma.experimentSubmission.upsert({
    where:  { experimentId_studentId: { experimentId, studentId } },
    create: { experimentId, studentId, classId: enrollment.classId, notes: notes || "", status: "pending" },
    update: { notes: notes || "", status: "pending", submittedAt: new Date(), reviewNotes: "", reviewedAt: null, reviewedById: null },
  });

  res.json({ ...submission, _id: submission.id });
};
