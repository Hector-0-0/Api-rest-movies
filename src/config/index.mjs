// src/config/index.mjs
// Configuración centralizada, cargada desde variables de entorno. Tener todos
// los accesos a env en un solo sitio deja el resto del código libre de
// `process.env` y más fácil de testear.

import "dotenv/config";

const parseOrigins = (value) =>
  (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

export const config = {
  env: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3000),

  // Lista blanca separada por comas, p. ej. "http://localhost:3000,https://foo.vercel.app"
  corsOrigins: parseOrigins(process.env.CORS_ORIGINS),

  db: {
    // Los proveedores gestionados (Neon, Render) exponen una única cadena de
    // conexión. Si está presente, gana sobre las variables DB_* de abajo.
    url: process.env.DATABASE_URL ?? null,

    host: process.env.DB_HOST ?? "localhost",
    user: process.env.DB_USER ?? "postgres",
    password: process.env.DB_PASSWORD ?? "postgres",
    database: process.env.DB_NAME ?? "moviesdb",
    port: Number(process.env.DB_PORT ?? 5432),
    // Neon y Render exigen TLS. Se activa con DB_SSL=true, o implícitamente si
    // la cadena de conexión contiene `sslmode=require`.
    ssl:
      process.env.DB_SSL === "true" ||
      (process.env.DATABASE_URL ?? "").includes("sslmode=require"),
  },

  auth: {
    // Secreto para firmar y verificar JWTs. DEBE sobreescribirse en producción.
    jwtSecret: process.env.JWT_SECRET ?? "dev-only-insecure-secret-change-me",
    // Vida del token, en el formato que acepta jsonwebtoken (p. ej. "1h", "7d").
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "1d",
    // Factor de coste de bcrypt (más alto = más lento = más seguro).
    bcryptRounds: Number(process.env.BCRYPT_ROUNDS ?? 10),
  },
};
