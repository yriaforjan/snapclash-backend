import { Request, Response } from "express";
import Group from "../models/Group";

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export const createGroup = async (req: Request, res: Response): Promise<void> => {
  const { name } = req.body;
  const userId = req.user!._id;

  if (!name) {
    res.status(400).json({ error: "El nombre del grupo es obligatorio" });
    return;
  }

  try {
    const group = await Group.create({
      name,
      created_by: userId,
      invite_code: generateInviteCode(),
      members: [userId],
    });
    res.status(201).json(group);
  } catch {
    res.status(500).json({ error: "Error al crear el grupo" });
  }
};

export const joinGroup = async (req: Request, res: Response): Promise<void> => {
  const { invite_code } = req.body;
  const userId = req.user!._id;

  if (!invite_code) {
    res.status(400).json({ error: "El código de invitación es obligatorio" });
    return;
  }

  const group = await Group.findOne({ invite_code: invite_code.toUpperCase() });

  if (!group) {
    res.status(404).json({ error: "Código de invitación inválido" });
    return;
  }

  if (group.members.some((m) => m.equals(userId))) {
    res.status(409).json({ error: "Ya eres miembro de este grupo" });
    return;
  }

  group.members.push(userId);
  await group.save();

  res.json(group);
};

export const getGroupMembers = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user!._id;

  const group = await Group.findById(id).populate("members", "id username avatar_url");

  if (!group) {
    res.status(404).json({ error: "Grupo no encontrado" });
    return;
  }

  if (!group.members.some((m) => m.equals(userId))) {
    res.status(403).json({ error: "No eres miembro de este grupo" });
    return;
  }

  res.json(group.members);
};

export const getMyGroups = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!._id;
  const groups = await Group.find({ members: userId });
  res.json(groups);
};
