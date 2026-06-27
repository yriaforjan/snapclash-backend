import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

export const signAccessToken = (userId: string): string =>
  jwt.sign({ id: userId }, ACCESS_SECRET, { expiresIn: "15m" });

export const signRefreshToken = (userId: string): string =>
  jwt.sign({ id: userId }, REFRESH_SECRET, { expiresIn: "30d" });

export const verifyAccessToken = (token: string): { id: string } =>
  jwt.verify(token, ACCESS_SECRET) as { id: string };

export const verifyRefreshToken = (token: string): { id: string } =>
  jwt.verify(token, REFRESH_SECRET) as { id: string };
