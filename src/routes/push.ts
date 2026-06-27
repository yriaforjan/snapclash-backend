import { Router } from "express";
import { getVapidPublicKey, subscribe, unsubscribe } from "../controllers/push";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.get("/vapid-public-key", getVapidPublicKey);
router.post("/subscribe", authenticate, subscribe);
router.post("/unsubscribe", authenticate, unsubscribe);

export default router;
