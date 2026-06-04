import prisma from "../lib/prisma.js";

const fmt = (c) => ({
  ...c,
  _id: c.id,
  student: c.student ? { ...c.student, _id: c.student.id } : undefined,
  exam: c.exam ? { ...c.exam, _id: c.exam.id } : undefined,
});

export const getAllCertificates = async (req, res) => {
  const certs = await prisma.certificate.findMany({
    include: {
      student: { select: { id: true, fullName: true, email: true, rollNumber: true, avatarColor: true, institute: { select: { id: true, name: true } } } },
      exam:    { select: { id: true, title: true } },
    },
    orderBy: { issuedAt: "desc" },
  });
  res.json(certs.map(fmt));
};

export const getMyCertificates = async (req, res) => {
  const certs = await prisma.certificate.findMany({
    where: { studentId: req.user.id },
    orderBy: { issuedAt: "desc" },
  });
  res.json(certs.map((c) => ({ ...c, _id: c.id })));
};

export const createCertificate = async (req, res) => {
  const { studentId, examId, examTitle, roboticsLevel, score, totalMarks } = req.body;
  if (!studentId || !examId || !examTitle || !roboticsLevel || score === undefined || !totalMarks)
    return res.status(400).json({ message: "All fields are required." });

  const cert = await prisma.certificate.upsert({
    where: { studentId_examId: { studentId, examId } },
    create: {
      studentId, examId,
      examTitle, roboticsLevel: Number(roboticsLevel),
      score: Number(score), totalMarks: Number(totalMarks),
    },
    update: {
      examTitle, roboticsLevel: Number(roboticsLevel),
      score: Number(score), totalMarks: Number(totalMarks),
      issuedAt: new Date(),
    },
    include: {
      student: { select: { id: true, fullName: true, email: true, rollNumber: true, avatarColor: true, institute: { select: { id: true, name: true } } } },
      exam:    { select: { id: true, title: true } },
    },
  });
  res.status(201).json(fmt(cert));
};

export const deleteCertificate = async (req, res) => {
  await prisma.certificate.delete({ where: { id: req.params.id } });
  res.json({ message: "Deleted." });
};
