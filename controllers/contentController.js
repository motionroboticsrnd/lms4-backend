import prisma from "../lib/prisma.js";

export const getContent = async (req, res) => {
  const { level, type, institute } = req.query;
  const where = {};
  if (level)     where.roboticsLevel = Number(level);
  if (type)      where.type = type;
  if (institute) where.instituteId   = institute === "global" ? null : institute;
  const content = await prisma.content.findMany({
    where,
    include: { institute: { select: { id: true, name: true, code: true } } },
    orderBy: { roboticsLevel: "asc" },
  });
  res.json(content.map((c) => ({ ...c, _id: c.id })));
};

export const createContent = async (req, res) => {
  const { title, description, type, url, roboticsLevel, instituteId } = req.body;
  if (!title || !type || !url || !roboticsLevel)
    return res.status(400).json({ message: "title, type, url and roboticsLevel are required." });
  const item = await prisma.content.create({
    data: {
      title,
      description: description || "",
      type,
      url,
      roboticsLevel: Number(roboticsLevel),
      instituteId:   instituteId || null,
    },
    include: { institute: { select: { id: true, name: true, code: true } } },
  });
  res.status(201).json({ ...item, _id: item.id });
};

export const updateContent = async (req, res) => {
  const { title, description, type, url, roboticsLevel, instituteId } = req.body;
  try {
    const item = await prisma.content.update({
      where: { id: req.params.id },
      data: {
        title,
        description,
        type,
        url,
        roboticsLevel: Number(roboticsLevel),
        instituteId:   instituteId || null,
      },
      include: { institute: { select: { id: true, name: true, code: true } } },
    });
    res.json({ ...item, _id: item.id });
  } catch {
    res.status(404).json({ message: "Content not found." });
  }
};

export const deleteContent = async (req, res) => {
  await prisma.content.delete({ where: { id: req.params.id } });
  res.json({ message: "Deleted." });
};

// Visible to a user = content with no instituteId (global) OR matching their instituteId
export const getContentByLevel = async (req, res) => {
  const userInstituteId = req.user.instituteId || null;
  const level = Number(req.params.level);

  const content = await prisma.content.findMany({
    where: {
      roboticsLevel: level,
      OR: [
        { instituteId: null },
        ...(userInstituteId ? [{ instituteId: userInstituteId }] : []),
      ],
    },
    orderBy: { type: "asc" },
  });
  res.json(content.map((c) => ({ ...c, _id: c.id })));
};
