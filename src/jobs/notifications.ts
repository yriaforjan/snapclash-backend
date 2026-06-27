import cron from "node-cron";
import Challenge from "../models/Challenge";
import Submission from "../models/Submission";
import PushSubscription from "../models/PushSubscription";
import { sendToAll, sendToUser } from "../services/push";
import { getActiveChallengeDate } from "../utils/date";

export function startCronJobs(): void {
  cron.schedule(
    "0 10 * * *",
    async () => {
      try {
        const today = getActiveChallengeDate();
        const challenge = await Challenge.findOne({ scheduled_date: today });
        const isSpecial = challenge?.is_weekend_special ?? false;

        await sendToAll({
          title: isSpecial ? "SnapClash 🔥" : "SnapClash 📷",
          body: isSpecial
            ? "Reto especial de fin de semana, multiplica tus puntos 🔥"
            : "¡El reto de hoy ya está disponible!",
          url: "/",
          type: "challenge",
        });
      } catch (err) {
        console.error("Cron challenge error:", err);
      }
    },
    { timezone: "Europe/Madrid" }
  );

  cron.schedule(
    "0 16 * * *",
    async () => {
      try {
        const today = getActiveChallengeDate();
        const challenge = await Challenge.findOne({ scheduled_date: today });
        if (!challenge) return;

        const submittedIds = await Submission.find({
          challenge_id: challenge._id,
          photo_url: { $ne: null },
        }).distinct("user_id");

        const pendingIds = await PushSubscription.find({
          user_id: { $nin: submittedIds },
        }).distinct("user_id");

        await Promise.allSettled(
          pendingIds.map((userId) =>
            sendToUser(userId, {
              title: "SnapClash ⚡",
              body: "El jurado bosteza... Dale algo que puntuar. 📸",
              url: "/",
              type: "reminder",
            })
          )
        );
      } catch (err) {
        console.error("Cron afternoon reminder error:", err);
      }
    },
    { timezone: "Europe/Madrid" }
  );

  cron.schedule(
    "0 20 * * *",
    async () => {
      try {
        const today = getActiveChallengeDate();
        const challenge = await Challenge.findOne({ scheduled_date: today });
        if (!challenge) return;

        const revealedIds = await Submission.find({ challenge_id: challenge._id }).distinct(
          "user_id"
        );
        const pendingIds = await PushSubscription.find({ user_id: { $nin: revealedIds } }).distinct(
          "user_id"
        );

        await Promise.allSettled(
          pendingIds.map((userId) =>
            sendToUser(userId, {
              title: "SnapClash ⏰",
              body: "El reto de hoy todavía te espera. ¡Aún estás a tiempo!",
              url: "/",
              type: "reminder",
            })
          )
        );
      } catch (err) {
        console.error("Cron reminder error:", err);
      }
    },
    { timezone: "Europe/Madrid" }
  );
}
