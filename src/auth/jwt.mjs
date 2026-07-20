// auth/jwt.mjs
// Envoltorio fino sobre jsonwebtoken para que el resto de la app firme y
// verifique tokens sin importar la librería ni tocar la configuración.
import jwt from "jsonwebtoken";
import { config } from "../config/index.mjs";

/** Firma un JWT que lleva el id, el email y el rol del usuario. */
export const signToken = (user) =>
  jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    config.auth.jwtSecret,
    { expiresIn: config.auth.jwtExpiresIn },
  );

/** Verifica un token y devuelve su payload decodificado (lanza si es inválido). */
export const verifyToken = (token) => jwt.verify(token, config.auth.jwtSecret);
