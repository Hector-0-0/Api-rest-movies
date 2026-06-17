// src/config/index.mjs
// Centralized application configuration loaded from environment variables.
// Keeping every env access in one place makes the rest of the codebase
// free of `process.env` lookups and easy to test.

import "dotenv/config";

const parseOrigins = (value) =>
  (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

export const config = {
  env: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3000),

  // Comma-separated whitelist, e.g. "http://localhost:3000,https://foo.vercel.app"
  corsOrigins: parseOrigins(process.env.CORS_ORIGINS),

  db: {
    host: process.env.DB_HOST ?? "localhost",
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "moviesdb",
    port: Number(process.env.DB_PORT ?? 3306),
    // Aiven (and most managed MySQL) require TLS. Enable with DB_SSL=true.
    ssl: process.env.DB_SSL === "true",
  },
};
