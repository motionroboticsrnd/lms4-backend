import prisma from "../lib/prisma.js";

export const getContent = async (req, res) => {
  const { level, type } = req.query;
  const where = {};
  if (level) where.roboticsLevel = Number(level);
  if (type)  where.type = type;
  const content = await prisma.content.findMany({ where, orderBy: { roboticsLevel: "asc" } });
  res.json(content.map((c) => ({ ...c, _id: c.id })));
};

export const createContent = async (req, res) => {
  const { title, description, type, url, roboticsLevel } = req.body;
  if (!title || !type || !url || !roboticsLevel)
    return res.status(400).json({ message: "title, type, url and roboticsLevel are required." });
  const item = await prisma.content.create({
    data: { title, description: description || "", type, url, roboticsLevel: Number(roboticsLevel) },
  });
  res.status(201).json({ ...item, _id: item.id });
};

export const updateContent = async (req, res) => {
  const { title, description, type, url, roboticsLevel } = req.body;
  try {
    const item = await prisma.content.update({
      where: { id: req.params.id },
      data: { title, description, type, url, roboticsLevel: Number(roboticsLevel) },
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

export const getContentByLevel = async (req, res) => {
  const content = await prisma.content.findMany({
    where: { roboticsLevel: Number(req.params.level) },
    orderBy: { type: "asc" },
  });
  res.json(content.map((c) => ({ ...c, _id: c.id })));
};
