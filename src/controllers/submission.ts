import { Request, Response } from "express";
import sharp from "sharp";
import { IUser } from "../models/User";
import { IChallenge } from "../models/Challenge";
import Submission from "../models/Submission";
import Comment from "../models/Comment";
import Group from "../models/Group";
import { uploadToCloudinary, blurUrl } from "../config/cloudinary";
import { evaluatePhoto } from "../services/ai";
import {
  REVEAL_WINDOW_SECONDS,
  WEEKEND_REVEAL_WINDOW_SECONDS,
  MAX_SCORE,
  getMultiplier,
} from "../config/constants";
import { getActiveChallenge } from "../utils/challenge";

export const submitPhoto = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!._id;

  if (!req.file) {
    res.status(400).json({ error: "La foto es obligatoria" });
    return;
  }

  const challenge = await getActiveChallenge();

  if (!challenge) {
    res.status(404).json({ error: "No hay reto para hoy" });
    return;
  }

  const submission = await Submission.findOne({ challenge_id: challenge._id, user_id: userId });

  if (!submission) {
    res.status(403).json({ error: "Debes revelar el reto antes de subir la foto" });
    return;
  }

  if (submission.photo_url) {
    res.status(409).json({ error: "Ya has subido tu foto para el reto de hoy" });
    return;
  }

  const submitted_at = new Date();
  const revealWindow = challenge.is_weekend_special
    ? WEEKEND_REVEAL_WINDOW_SECONDS
    : REVEAL_WINDOW_SECONDS;
  const elapsed = Math.floor((submitted_at.getTime() - submission.started_at.getTime()) / 1000);
  const speed_score =
    elapsed <= revealWindow ? Math.round((1 - elapsed / revealWindow) * MAX_SCORE) : 0;

  let photoBuffer = req.file.buffer;
  let photoMimeType = req.file.mimetype;
  try {
    photoBuffer = await sharp(req.file.buffer)
      .rotate()
      .resize(1920, 1920, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    photoMimeType = "image/jpeg";
  } catch {
    // si sharp falla, continúa con el buffer original
  }

  let photo_url: string;
  try {
    photo_url = await uploadToCloudinary(photoBuffer);
  } catch {
    res.status(500).json({ error: "Error al subir la foto" });
    return;
  }

  submission.photo_url = photo_url;
  submission.submitted_at = submitted_at;
  submission.speed_score = speed_score;
  await submission.save();

  const total_points = Math.round(speed_score * getMultiplier(challenge.is_weekend_special));

  res.status(201).json({ ...submission.toObject(), total_points, ai_pending: true });

  // gemini corre en background sin bloquear la respuesta
  evaluatePhoto(photoBuffer, photoMimeType, challenge.description)
    .then(async (result) => {
      submission.similarity_score = result.similarity_score;
      submission.originality_score = result.originality_score;
      submission.ai_justification = result.ai_justification;
      submission.ai_status = "completed";
      await submission.save();
    })
    .catch(async (err) => {
      console.error(`[ai] evaluation failed for submission ${submission._id}:`, err);
      submission.ai_justification = "No se pudo evaluar la foto en este momento.";
      submission.ai_status = "failed";
      await submission.save().catch((saveErr) => {
        console.error(
          `[ai] failed to save failed status for submission ${submission._id}:`,
          saveErr
        );
      });
    });
};

export const getGroupFeed = async (req: Request, res: Response): Promise<void> => {
  const { groupId } = req.params;
  const userId = req.user!._id;

  const group = await Group.findById(groupId);

  if (!group || !group.members.some((m) => m.equals(userId))) {
    res.status(403).json({ error: "No eres miembro de este grupo" });
    return;
  }

  const challenge = await getActiveChallenge();

  if (!challenge) {
    res.status(404).json({ error: "No hay reto para hoy" });
    return;
  }

  const mySubmission = await Submission.findOne({ challenge_id: challenge._id, user_id: userId });
  const userHasSubmitted = !!mySubmission?.photo_url;

  const submissions = await Submission.find({
    challenge_id: challenge._id,
    user_id: { $in: group.members },
    photo_url: { $ne: null },
  })
    .populate("user_id", "id username avatar_url")
    .sort({ submitted_at: -1 });

  const multiplier = getMultiplier(challenge.is_weekend_special);

  const feed = submissions.map((s) => {
    const user = s.user_id as IUser;
    if (!userHasSubmitted) {
      return { id: s._id, user, photo_url: blurUrl(s.photo_url!), submitted_at: s.submitted_at };
    }
    return {
      id: s._id,
      user,
      photo_url: s.photo_url,
      submitted_at: s.submitted_at,
      speed_score: s.speed_score,
      similarity_score: s.similarity_score,
      originality_score: s.originality_score,
      ai_justification: s.ai_justification,
      total_points: Math.round(
        (s.speed_score + s.similarity_score + s.originality_score) * multiplier
      ),
    };
  });

  res.json({ unlocked: userHasSubmitted, submissions: feed });
};

export const getTodayScore = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!._id;
  const challenge = await getActiveChallenge();
  if (!challenge) {
    res.status(404).json({ error: "No hay reto para hoy" });
    return;
  }
  const submission = await Submission.findOne({ challenge_id: challenge._id, user_id: userId });
  if (!submission?.photo_url) {
    res.status(404).json({ error: "No has subido foto hoy" });
    return;
  }
  const multiplier = getMultiplier(challenge.is_weekend_special);
  const total_points = Math.round(
    (submission.speed_score + submission.similarity_score + submission.originality_score) *
      multiplier
  );
  res.json({
    similarity_score: submission.similarity_score,
    originality_score: submission.originality_score,
    ai_justification: submission.ai_justification,
    total_points,
    ai_pending: submission.ai_status === "pending",
    ai_failed: submission.ai_status === "failed",
  });
};

export const retryEvaluation = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!._id;
  const challenge = await getActiveChallenge();
  if (!challenge) {
    res.status(404).json({ error: "No hay reto para hoy" });
    return;
  }
  const submission = await Submission.findOne({ challenge_id: challenge._id, user_id: userId });
  if (!submission?.photo_url) {
    res.status(404).json({ error: "No has subido foto hoy" });
    return;
  }
  if (submission.ai_status !== "failed") {
    res.status(409).json({ error: "Solo se puede reintentar si la evaluación falló" });
    return;
  }

  submission.ai_status = "pending";
  submission.ai_justification = null;
  submission.similarity_score = 0;
  submission.originality_score = 0;
  await submission.save();

  res.json({ ai_pending: true });

  fetch(submission.photo_url)
    .then((r) => r.arrayBuffer())
    .then(async (buf) => {
      const photoBuffer = Buffer.from(buf);
      const result = await evaluatePhoto(photoBuffer, "image/jpeg", challenge.description);
      submission.similarity_score = result.similarity_score;
      submission.originality_score = result.originality_score;
      submission.ai_justification = result.ai_justification;
      submission.ai_status = "completed";
      await submission.save();
    })
    .catch(async (err) => {
      console.error(`[ai] retry failed for submission ${submission._id}:`, err);
      submission.ai_status = "failed";
      submission.ai_justification = "No se pudo evaluar la foto en este momento.";
      await submission.save().catch((saveErr) => {
        console.error(
          `[ai] failed to save retry status for submission ${submission._id}:`,
          saveErr
        );
      });
    });
};

export const getHistory = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!._id;

  const submissions = await Submission.find({ user_id: userId, photo_url: { $ne: null } })
    .populate("challenge_id", "description scheduled_date is_weekend_special")
    .sort({ submitted_at: -1 });

  const submissionIds = submissions.map((s) => s._id);
  const allComments = await Comment.find({ submission_id: { $in: submissionIds } })
    .populate("user_id", "id username avatar_url")
    .sort({ createdAt: 1 });

  const commentsBySubmission = new Map<string, typeof allComments>();
  for (const c of allComments) {
    const key = String(c.submission_id);
    if (!commentsBySubmission.has(key)) commentsBySubmission.set(key, []);
    commentsBySubmission.get(key)!.push(c);
  }

  const result = submissions.map((s) => {
    const challenge = s.challenge_id as IChallenge;
    const total_points = Math.round(
      (s.speed_score + s.similarity_score + s.originality_score) *
        getMultiplier(challenge.is_weekend_special)
    );

    const subComments = (commentsBySubmission.get(String(s._id)) ?? []).filter(
      (c) => c.user_id != null
    );
    const topLevel = subComments.filter((c) => !c.parent_id);
    const replies = subComments.filter((c) => c.parent_id);

    const comments = topLevel.map((c) => ({
      ...c.toObject(),
      replies: replies.filter((r) => String(r.parent_id) === String(c._id)),
    }));

    return {
      id: s._id,
      photo_url: s.photo_url,
      submitted_at: s.submitted_at,
      speed_score: s.speed_score,
      similarity_score: s.similarity_score,
      originality_score: s.originality_score,
      ai_justification: s.ai_justification,
      total_points,
      challenge: {
        description: challenge.description,
        scheduled_date: challenge.scheduled_date,
        is_weekend_special: challenge.is_weekend_special,
      },
      comments,
    };
  });

  res.json(result);
};
