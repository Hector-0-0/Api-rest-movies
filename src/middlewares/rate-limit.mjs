// src/middlewares/rate-limit.mjs
// Basic IP rate limiting to protect the API from abuse/bursts.

import rateLimit from "express-rate-limit";
import { config } from "../config/index.mjs";

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
  standardHeaders: true, // RateLimit-* headers
  legacyHeaders: false,
  // Tests hit the API many times from one IP; don't throttle them.
  skip: () => config.env === "test",
  message: {
    status: 429,
    code: "TOO_MANY_REQUESTS",
    message: "Too many requests, please try again later",
  },
});
