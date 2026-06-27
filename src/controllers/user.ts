import { Request, Response } from "express";
import User from "../models/User";
import { uploadToCloudinary, deleteFromCloudinary } from "../config/cloudinary";
import { signAccessToken, signRefreshToken } from "../utils/token";
import { REFRESH_COOKIE_OPTIONS } from "../config/cookies";

export const getMe = async (req: Request, res: Response): Promise<void> => {
  res.json({ user: req.user });
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  const user = await User.findById(req.params.id).select("id username avatar_url");

  if (!user) {
    res.status(404).json({ error: "Usuario no encontrado" });
    return;
  }

  res.json(user);
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  const { username } = req.body;

  if (!username?.trim()) {
    res.status(400).json({ error: "El username no puede estar vacío" });
    return;
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.user!._id,
      { username: username.trim() },
      { returnDocument: "after", runValidators: true }
    ).select("-password");

    res.json({ user });
  } catch (err: unknown) {
    const mongoErr = err as { code?: number };
    if (mongoErr.code === 11000) {
      res.status(400).json({ error: "Ese username ya está en uso" });
      return;
    }
    res.status(500).json({ error: "Error al actualizar el perfil" });
  }
};

export const updateAvatar = async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "La imagen es obligatoria" });
    return;
  }

  const oldAvatarUrl = req.user!.avatar_url;

  let avatar_url: string;
  try {
    avatar_url = await uploadToCloudinary(req.file.buffer);
  } catch {
    res.status(500).json({ error: "Error al subir la imagen" });
    return;
  }

  const user = await User.findByIdAndUpdate(
    req.user!._id,
    { avatar_url },
    { returnDocument: "after" }
  ).select("-password");

  if (oldAvatarUrl) {
    deleteFromCloudinary(oldAvatarUrl).catch(() => {});
  }

  res.json({ user });
};

export const updatePassword = async (req: Request, res: Response): Promise<void> => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    res.status(400).json({ error: "Contraseña actual y nueva son obligatorias" });
    return;
  }

  if (new_password.length < 6) {
    res.status(400).json({ error: "La nueva contraseña debe tener al menos 6 caracteres" });
    return;
  }

  const user = await User.findById(req.user!._id);
  if (!user) {
    res.status(404).json({ error: "Usuario no encontrado" });
    return;
  }

  const valid = await user.comparePassword(current_password);
  if (!valid) {
    res.status(400).json({ error: "La contraseña actual es incorrecta" });
    return;
  }

  user.password = new_password;
  await user.save();

  const id = String(user._id);
  const access_token = signAccessToken(id);
  const refresh_token = signRefreshToken(id);

  res.cookie("refresh_token", refresh_token, REFRESH_COOKIE_OPTIONS);
  res.json({ message: "Contraseña actualizada", access_token });
};
