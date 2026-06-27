import express, { Request, Response, NextFunction } from "express";
import { Error as MongooseError } from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import userRoutes from "./routes/user";
import authRoutes from "./routes/auth";
import groupRoutes from "./routes/group";
import challengeRoutes from "./routes/challenge";
import submissionRoutes from "./routes/submission";
import rankingRoutes from "./routes/ranking";
import commentRoutes from "./routes/comment";
import pushRoutes from "./routes/push";

const app = express();
app.set("trust proxy", 1);
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos, espera 15 minutos" },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas peticiones, espera 15 minutos" },
});

app.use(helmet());
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use((req, _res, next) => {
  if (req.body) mongoSanitize.sanitize(req.body);
  if (req.params) mongoSanitize.sanitize(req.params);
  next();
});

app.use("/api/v1/auth", authLimiter, authRoutes);
app.use("/api/v1/users", apiLimiter, userRoutes);
app.use("/api/v1/groups", apiLimiter, groupRoutes);
app.use("/api/v1/challenges", apiLimiter, challengeRoutes);
app.use("/api/v1/submissions", apiLimiter, submissionRoutes);
app.use("/api/v1/rankings", apiLimiter, rankingRoutes);
app.use("/api/v1/groups/:groupId/comments", apiLimiter, commentRoutes);
app.use("/api/v1/push", apiLimiter, pushRoutes);

app.get("/", (_req, res) => {
  res.send("Backend ok :)");
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", database: "connected" });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  if (err instanceof MongooseError.ValidationError) {
    res.status(400).json({ error: err.message });
    return;
  }
  if (err instanceof MongooseError.CastError) {
    res.status(400).json({ error: `ID inválido: ${err.path}` });
    return;
  }
  res.status(500).json({ error: "Error interno del servidor" });
});

export default app;
