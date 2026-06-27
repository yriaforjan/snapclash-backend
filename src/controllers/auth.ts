import crypto from "crypto";
import { Request, Response } from "express";
import User from "../models/User";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/token";
import { sendVerificationEmail } from "../services/email";
import { REFRESH_COOKIE_OPTIONS } from "../config/cookies";

const userPayload = (user: InstanceType<typeof User>) => ({
  id: user._id,
  username: user.username,
  email: user.email,
  avatar_url: user.avatar_url,
});

export const register = async (req: Request, res: Response): Promise<void> => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    res.status(400).json({ error: "username, email y password son obligatorios" });
    return;
  }

  try {
    const verification_token = crypto.randomBytes(32).toString("hex");
    const verification_token_expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await User.create({
      username,
      email,
      password,
      verification_token,
      verification_token_expires,
    });

    sendVerificationEmail(email, verification_token).catch((err) =>
      console.error("Email error:", err)
    );

    res.status(201).json({ message: "Cuenta creada. Revisa tu email para confirmarla." });
  } catch (err: unknown) {
    const mongoErr = err as { code?: number; keyPattern?: Record<string, unknown> };
    if (mongoErr.code === 11000 && mongoErr.keyPattern) {
      const field = Object.keys(mongoErr.keyPattern)[0];
      res.status(400).json({ error: `El ${field} ya está en uso` });
      return;
    }
    res.status(500).json({ error: "Error al registrar usuario" });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "email y password son obligatorios" });
    return;
  }

  const user = await User.findOne({ email });

  if (!user || !(await user.comparePassword(password))) {
    res.status(400).json({ error: "Email o contraseña incorrectos" });
    return;
  }

  if (!user.email_verified) {
    res.status(403).json({ error: "Confirma tu email antes de iniciar sesión" });
    return;
  }

  const access_token = signAccessToken(String(user._id));
  const refresh_token = signRefreshToken(String(user._id));

  res.cookie("refresh_token", refresh_token, REFRESH_COOKIE_OPTIONS);
  res.json({ access_token, user: userPayload(user) });
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  const token = req.cookies?.refresh_token;

  if (!token) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  try {
    const { id } = verifyRefreshToken(token);
    const user = await User.findById(id);

    if (!user) {
      res.status(401).json({ error: "Usuario no encontrado" });
      return;
    }

    if (!user.email_verified) {
      res.clearCookie("refresh_token", REFRESH_COOKIE_OPTIONS);
      res.status(401).json({ error: "No autenticado" });
      return;
    }

    const access_token = signAccessToken(id);
    const refresh_token = signRefreshToken(id);

    res.cookie("refresh_token", refresh_token, REFRESH_COOKIE_OPTIONS);
    res.json({ access_token, user: userPayload(user) });
  } catch {
    res.clearCookie("refresh_token", REFRESH_COOKIE_OPTIONS);
    res.status(401).json({ error: "Sesión expirada" });
  }
};

export const logout = (_req: Request, res: Response): void => {
  res.clearCookie("refresh_token", REFRESH_COOKIE_OPTIONS);
  res.json({ message: "Sesión cerrada" });
};

export const resendVerification = async (req: Request, res: Response): Promise<void> => {
  const { token, email } = req.body;

  if (!token && !email) {
    res.status(400).json({ error: "Se requiere token o email" });
    return;
  }

  const user = token
    ? await User.findOne({ verification_token: token })
    : await User.findOne({ email });

  if (user && !user.email_verified) {
    const verification_token = crypto.randomBytes(32).toString("hex");
    const verification_token_expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    user.verification_token = verification_token;
    user.verification_token_expires = verification_token_expires;
    await user.save();
    sendVerificationEmail(user.email, verification_token).catch((err) =>
      console.error("Email error:", err)
    );
  }

  res.json({ message: "Si el email existe y no está verificado, recibirás un nuevo enlace." });
};

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  const { token } = req.query;

  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "Token inválido" });
    return;
  }

  const user = await User.findOne({ verification_token: token });

  if (!user || (user.verification_token_expires && user.verification_token_expires < new Date())) {
    res.status(400).json({ error: "Token inválido o expirado" });
    return;
  }

  user.email_verified = true;
  user.verification_token = null;
  user.verification_token_expires = null;
  await user.save();

  const access_token = signAccessToken(String(user._id));
  const refresh_token = signRefreshToken(String(user._id));

  res.cookie("refresh_token", refresh_token, REFRESH_COOKIE_OPTIONS);
  res.json({ access_token, user: userPayload(user) });
};
