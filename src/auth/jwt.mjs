// auth/jwt.mjs
// Thin wrapper around jsonwebtoken so the rest of the app signs/verifies tokens
// without importing the library or reaching into config directly.
import jwt from "jsonwebtoken";
import { config } from "../config/index.mjs";

/** Signs a JWT carrying the user's id, email and role. */
export const signToken = (user) =>
  jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    config.auth.jwtSecret,
    { expiresIn: config.auth.jwtExpiresIn },
  );

/** Verifies a token and returns its decoded payload (throws if invalid). */
export const verifyToken = (token) => jwt.verify(token, config.auth.jwtSecret);
