const IS_PRODUCTION = process.env.NODE_ENV === "production";

export const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: "strict" as const,
  maxAge: 30 * 24 * 60 * 60 * 1000,
};
