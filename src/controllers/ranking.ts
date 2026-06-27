import { Request, Response } from "express";
import Group from "../models/Group";
import Submission from "../models/Submission";
import { WEEKEND_MULTIPLIER } from "../config/constants";
import { getActiveChallengeDate, getWeekStartDate, getMonthStartDate } from "../utils/date";

type Period = "day" | "week" | "month";

function getFromDate(period: Period): string {
  if (period === "day") return getActiveChallengeDate();
  if (period === "week") return getWeekStartDate();
  return getMonthStartDate();
}

export const getGroupRanking = async (req: Request, res: Response): Promise<void> => {
  const { groupId } = req.params;
  const period = (req.query.period as Period) || "day";
  const userId = req.user!._id;

  if (!["day", "week", "month"].includes(period)) {
    res.status(400).json({ error: "period debe ser day, week o month" });
    return;
  }

  const group = await Group.findById(groupId);

  if (!group || !group.members.some((m) => m.equals(userId))) {
    res.status(403).json({ error: "No eres miembro de este grupo" });
    return;
  }

  const rows = await Submission.aggregate([
    {
      $match: {
        user_id: { $in: group.members },
        photo_url: { $ne: null },
      },
    },
    {
      $lookup: {
        from: "challenges",
        localField: "challenge_id",
        foreignField: "_id",
        as: "challenge",
      },
    },
    { $unwind: "$challenge" },
    { $match: { "challenge.scheduled_date": { $gte: getFromDate(period) } } },
    {
      $group: {
        _id: "$user_id",
        total: {
          $sum: {
            $round: [
              {
                $multiply: [
                  { $add: ["$speed_score", "$similarity_score", "$originality_score"] },
                  { $cond: ["$challenge.is_weekend_special", WEEKEND_MULTIPLIER, 1] },
                ],
              },
              0,
            ],
          },
        },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    { $sort: { total: -1 } },
    {
      $project: {
        _id: 0,
        user: {
          id: { $toString: "$user._id" },
          username: "$user.username",
          avatar_url: "$user.avatar_url",
        },
        total_points: "$total",
      },
    },
  ]);

  const ranking = rows.map((entry, i) => ({ position: i + 1, ...entry }));

  res.json({ period, ranking });
};
