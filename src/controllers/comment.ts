import { Request, Response } from "express";
import { Types } from "mongoose";
import Comment from "../models/Comment";
import Submission from "../models/Submission";
import Group from "../models/Group";
import { sendToUser } from "../services/push";
import type { IUser } from "../models/User";

async function userCanAccessInGroup(
  submissionId: string,
  userId: string,
  groupId: string
): Promise<boolean> {
  const submission = await Submission.findById(submissionId);
  if (!submission) return false;

  const group = await Group.findOne({
    _id: groupId,
    members: { $all: [userId, submission.user_id as Types.ObjectId] },
  });
  if (!group) return false;

  const mySubmission = await Submission.findOne({
    challenge_id: submission.challenge_id,
    user_id: userId,
    photo_url: { $ne: null },
  });

  return !!mySubmission;
}

export const getComments = async (req: Request, res: Response): Promise<void> => {
  const submissionId = String(req.params.submissionId);
  const groupId = String(req.params.groupId);
  const userId = String(req.user!._id);

  const canAccess = await userCanAccessInGroup(submissionId, userId, groupId);
  if (!canAccess) {
    res.status(403).json({ error: "Debes participar para ver los comentarios" });
    return;
  }

  const allComments = await Comment.find({ submission_id: submissionId, group_id: groupId })
    .populate("user_id", "id username avatar_url")
    .sort({ createdAt: 1 });

  const validComments = allComments.filter((c) => c.user_id != null);
  const topLevel = validComments.filter((c) => !c.parent_id);
  const replies = validComments.filter((c) => c.parent_id);

  const result = topLevel.map((c) => ({
    ...c.toObject(),
    replies: replies.filter((r) => String(r.parent_id) === String(c._id)),
  }));

  res.json(result);
};

export const addComment = async (req: Request, res: Response): Promise<void> => {
  const submissionId = String(req.params.submissionId);
  const groupId = String(req.params.groupId);
  const userId = String(req.user!._id);
  const { text, parent_id } = req.body;

  if (!text?.trim()) {
    res.status(400).json({ error: "El comentario no puede estar vacío" });
    return;
  }

  const canAccess = await userCanAccessInGroup(submissionId, userId, groupId);
  if (!canAccess) {
    res.status(403).json({ error: "Debes participar para comentar" });
    return;
  }

  if (parent_id) {
    const parent = await Comment.findById(parent_id);
    if (!parent || parent.parent_id) {
      res.status(400).json({ error: "Solo se puede responder a comentarios de primer nivel" });
      return;
    }
  }

  const comment = await Comment.create({
    submission_id: submissionId,
    group_id: groupId,
    user_id: new Types.ObjectId(userId),
    text: text.trim(),
    parent_id: parent_id || null,
  });

  await comment.populate("user_id", "id username avatar_url");

  res.status(201).json(comment);

  const commenterUsername = (comment.user_id as IUser).username;
  const feedUrl = `/groups/${groupId}/feed`;

  (async () => {
    const submission = await Submission.findById(submissionId);
    if (!submission) return;

    const submissionOwnerId = submission.user_id as Types.ObjectId;
    if (!submissionOwnerId.equals(userId)) {
      sendToUser(submissionOwnerId, {
        title: "SnapClash",
        body: `${commenterUsername} comentó en tu foto`,
        url: feedUrl,
        type: "comment",
      }).catch(() => {});
    }

    if (parent_id) {
      const parentComment = await Comment.findById(parent_id);
      const parentOwnerId = parentComment?.user_id as Types.ObjectId | undefined;
      if (
        parentComment &&
        parentOwnerId &&
        !parentOwnerId.equals(userId) &&
        !parentOwnerId.equals(submissionOwnerId)
      ) {
        sendToUser(parentOwnerId, {
          title: "SnapClash",
          body: `${commenterUsername} respondió a tu comentario`,
          url: feedUrl,
          type: "reply",
        }).catch(() => {});
      }
    }
  })().catch(() => {});
};
