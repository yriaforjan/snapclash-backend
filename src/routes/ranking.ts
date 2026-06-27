import { Router } from "express";
import { getGroupRanking } from "../controllers/ranking";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.use(authenticate);

router.get("/:groupId", getGroupRanking);

export default router;
