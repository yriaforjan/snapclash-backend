import { Router } from "express";
import { createGroup, joinGroup, getMyGroups, getGroupMembers } from "../controllers/group";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.use(authenticate);

router.post("/", createGroup);
router.post("/join", joinGroup);
router.get("/", getMyGroups);
router.get("/:id/members", getGroupMembers);

export default router;
