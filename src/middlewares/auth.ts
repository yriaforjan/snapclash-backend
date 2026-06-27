import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/token";
import User from "../models/User";

export const authorizeAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user?.isAdmin) {
    res.status(403).json({ error: "Acceso restringido" });
    return;
  }
  next();
};

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  try {
    const token = authHeader.slice(7);
    const { id } = verifyAccessToken(token);
    const user = await User.findById(id).select("-password");

    if (!user) {
      res.status(401).json({ error: "Usuario no encontrado" });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Sesión inválida o expirada" });
  }
};
