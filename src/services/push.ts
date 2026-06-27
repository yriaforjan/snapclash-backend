import webpush from "web-push";
import { Types } from "mongoose";
import PushSubscription from "../models/PushSubscription";

const vapidConfigured =
  !!process.env.VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY && !!process.env.VAPID_EMAIL;

if (vapidConfigured) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL}`,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  type: "challenge" | "reminder" | "comment" | "reply";
}

async function trySend(
  sub: { endpoint: string; p256dh: string; auth: string; _id: Types.ObjectId },
  payload: PushPayload
) {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    );
  } catch (err: unknown) {
    const e = err as { statusCode?: number };
    if (e.statusCode === 410 || e.statusCode === 404) {
      await PushSubscription.deleteOne({ _id: sub._id });
    }
  }
}

export const sendToUser = async (
  userId: Types.ObjectId | string,
  payload: PushPayload
): Promise<void> => {
  if (!vapidConfigured) return;
  const subs = await PushSubscription.find({ user_id: userId });
  await Promise.allSettled(subs.map((s) => trySend(s, payload)));
};

export const sendToAll = async (payload: PushPayload): Promise<void> => {
  if (!vapidConfigured) return;
  const subs = await PushSubscription.find();
  await Promise.allSettled(subs.map((s) => trySend(s, payload)));
};
