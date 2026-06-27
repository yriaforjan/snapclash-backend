import { Router } from "express";
import {
  submitPhoto,
  getGroupFeed,
  getHistory,
  getTodayScore,
  retryEvaluation,
} from "../controllers/submission";
import { authenticate } from "../middlewares/auth";
import upload, { validateImageBytes } from "../middlewares/upload";

const router = Router();

router.use(authenticate);

router.post("/", upload.single("photo"), validateImageBytes, submitPhoto);
router.get("/today/score", getTodayScore);
router.post("/today/retry", retryEvaluation);
router.get("/feed/:groupId", getGroupFeed);
router.get("/history", getHistory);

export default router;
