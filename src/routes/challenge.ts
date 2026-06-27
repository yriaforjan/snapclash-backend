import { Router } from "express";
import { createChallenge, getTodayChallenge, revealChallenge } from "../controllers/challenge";
import { authenticate, authorizeAdmin } from "../middlewares/auth";

const router = Router();

router.use(authenticate);

router.post("/", authorizeAdmin, createChallenge);
router.get("/today", getTodayChallenge);
router.post("/today/reveal", revealChallenge);

export default router;
