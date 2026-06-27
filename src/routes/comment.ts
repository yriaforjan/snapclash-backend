import { Router } from "express";
import { authenticate } from "../middlewares/auth";
import { getComments, addComment } from "../controllers/comment";

const router = Router({ mergeParams: true });

router.get("/:submissionId", authenticate, getComments);
router.post("/:submissionId", authenticate, addComment);

export default router;
