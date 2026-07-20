// src/middlewares/rate-limit.mjs
// Rate limiting básico por IP para proteger la API de abusos y picos.

import rateLimit from "express-rate-limit";
import { config } from "../config/index.mjs";

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 peticiones por IP y ventana
  standardHeaders: true, // cabeceras RateLimit-*
  legacyHeaders: false,
  // Los tests golpean la API muchas veces desde una sola IP; no los limitamos.
  skip: () => config.env === "test",
  message: {
    status: 429,
    code: "TOO_MANY_REQUESTS",
    message: "Too many requests, please try again later",
  },
});
