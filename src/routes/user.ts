import { Router } from "express";
import {
  getUserById,
  getMe,
  updateProfile,
  updateAvatar,
  updatePassword,
} from "../controllers/user";
import { authenticate } from "../middlewares/auth";
import upload, { validateImageBytes } from "../middlewares/upload";

const router = Router();

router.get("/me", authenticate, getMe);
router.put("/me", authenticate, updateProfile);
router.post("/me/avatar", authenticate, upload.single("avatar"), validateImageBytes, updateAvatar);
router.put("/me/password", authenticate, updatePassword);
router.get("/:id", authenticate, getUserById);

export default router;
