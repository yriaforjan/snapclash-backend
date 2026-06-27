import { Request, Response } from "express";
import Challenge from "../models/Challenge";
import Submission from "../models/Submission";
import {
  REVEAL_WINDOW_SECONDS,
  WEEKEND_REVEAL_WINDOW_SECONDS,
  getMultiplier,
} from "../config/constants";
import { getActiveChallenge } from "../utils/challenge";

export const createChallenge = async (req: Request, res: Response): Promise<void> => {
  const { description, scheduled_date, is_weekend_special } = req.body;

  if (!description || !scheduled_date) {
    res.status(400).json({ error: "description y scheduled_date son obligatorios" });
    return;
  }

  try {
    const challenge = await Challenge.create({
      description,
      scheduled_date,
      is_weekend_special: is_weekend_special ?? false,
    });
    res.status(201).json(challenge);
  } catch (err: unknown) {
    const mongoErr = err as { code?: number };
    if (mongoErr.code === 11000) {
      res.status(400).json({ error: "Ya existe un reto para esa fecha" });
      return;
    }
    res.status(500).json({ error: "Error al crear el reto" });
  }
};

export const getTodayChallenge = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!._id;

  const challenge = await getActiveChallenge();

  if (!challenge) {
    res.status(404).json({ error: "No hay reto para hoy" });
    return;
  }

  const submission = await Submission.findOne({ challenge_id: challenge._id, user_id: userId });

  if (!submission) {
    res.json({
      id: challenge._id,
      scheduled_date: challenge.scheduled_date,
      is_weekend_special: challenge.is_weekend_special,
      revealed: false,
    });
    return;
  }

  const window = challenge.is_weekend_special
    ? WEEKEND_REVEAL_WINDOW_SECONDS
    : REVEAL_WINDOW_SECONDS;
  const elapsed = Math.floor((Date.now() - submission.started_at.getTime()) / 1000);

  if (!submission.photo_url) {
    res.json({
      id: challenge._id,
      description: challenge.description,
      scheduled_date: challenge.scheduled_date,
      is_weekend_special: challenge.is_weekend_special,
      revealed: true,
      started_at: submission.started_at,
      submitted: false,
      seconds_remaining: Math.max(0, window - elapsed),
    });
    return;
  }

  const total_points = Math.round(
    (submission.speed_score + submission.similarity_score + submission.originality_score) *
      getMultiplier(challenge.is_weekend_special)
  );

  res.json({
    id: challenge._id,
    description: challenge.description,
    scheduled_date: challenge.scheduled_date,
    is_weekend_special: challenge.is_weekend_special,
    revealed: true,
    started_at: submission.started_at,
    submitted: true,
    seconds_remaining: Math.max(0, window - elapsed),
    photo_url: submission.photo_url,
    speed_score: submission.speed_score,
    similarity_score: submission.similarity_score,
    originality_score: submission.originality_score,
    ai_justification: submission.ai_justification,
    ai_failed: submission.ai_status === "failed",
    total_points,
  });
};

export const revealChallenge = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!._id;

  const challenge = await getActiveChallenge();

  if (!challenge) {
    res.status(404).json({ error: "No hay reto para hoy" });
    return;
  }

  const existing = await Submission.findOne({ challenge_id: challenge._id, user_id: userId });

  if (existing) {
    const revealWindow = challenge.is_weekend_special
      ? WEEKEND_REVEAL_WINDOW_SECONDS
      : REVEAL_WINDOW_SECONDS;
    const elapsed = Math.floor((Date.now() - existing.started_at.getTime()) / 1000);
    res.json({
      id: challenge._id,
      description: challenge.description,
      scheduled_date: challenge.scheduled_date,
      is_weekend_special: challenge.is_weekend_special,
      revealed: true,
      started_at: existing.started_at,
      submitted: !!existing.photo_url,
      seconds_remaining: Math.max(0, revealWindow - elapsed),
    });
    return;
  }

  let submission;
  try {
    submission = await Submission.create({
      challenge_id: challenge._id,
      user_id: userId,
      started_at: new Date(),
    });
  } catch (err: unknown) {
    const mongoErr = err as { code?: number };
    if (mongoErr.code === 11000) {
      submission = await Submission.findOne({ challenge_id: challenge._id, user_id: userId });
    } else {
      throw err;
    }
  }

  if (!submission) {
    res.status(500).json({ error: "Error al revelar el reto" });
    return;
  }

  const newWindow = challenge.is_weekend_special
    ? WEEKEND_REVEAL_WINDOW_SECONDS
    : REVEAL_WINDOW_SECONDS;
  const elapsed = Math.floor((Date.now() - submission.started_at.getTime()) / 1000);

  res.status(201).json({
    id: challenge._id,
    description: challenge.description,
    scheduled_date: challenge.scheduled_date,
    is_weekend_special: challenge.is_weekend_special,
    revealed: true,
    started_at: submission.started_at,
    submitted: !!submission.photo_url,
    seconds_remaining: Math.max(0, newWindow - elapsed),
  });
};
