import { Request, Response } from "express";
import PushSubscriptionModel from "../models/PushSubscription";

export const getVapidPublicKey = (_req: Request, res: Response): void => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY ?? null });
};

export const subscribe = async (req: Request, res: Response): Promise<void> => {
  const { endpoint, p256dh, auth } = req.body;
  const userId = req.user!._id;

  if (!endpoint || !p256dh || !auth) {
    res.status(400).json({ error: "Suscripción inválida" });
    return;
  }

  try {
    await PushSubscriptionModel.findOneAndUpdate(
      { endpoint },
      { user_id: userId, endpoint, p256dh, auth },
      { upsert: true, returnDocument: "after" }
    );
    res.status(201).json({ message: "Suscripción guardada" });
  } catch {
    res.status(500).json({ error: "Error al guardar la suscripción" });
  }
};

export const unsubscribe = async (req: Request, res: Response): Promise<void> => {
  const { endpoint } = req.body;

  if (!endpoint) {
    res.status(400).json({ error: "endpoint es obligatorio" });
    return;
  }

  await PushSubscriptionModel.deleteOne({ endpoint, user_id: req.user!._id });
  res.json({ message: "Suscripción eliminada" });
};
