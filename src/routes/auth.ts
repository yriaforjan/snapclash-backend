import { Router } from "express";
import {
  register,
  login,
  logout,
  refresh,
  verifyEmail,
  resendVerification,
} from "../controllers/auth";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh", refresh);
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);

export default router;
