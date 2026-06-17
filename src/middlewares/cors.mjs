//cors.mjs

// CORS configured via the `cors` package. The allowed origins come from
// configuration (CORS_ORIGINS env var); any *.vercel.app origin is allowed
// automatically so preview deploys work without listing each one.
import cors from "cors";
import { config } from "../config/index.mjs";

const ACCEPTED_ORIGINS = config.corsOrigins;

const isAllowed = (origin) =>
  // Requests with no Origin (curl, Postman, server-to-server) are allowed.
  !origin ||
  ACCEPTED_ORIGINS.includes(origin) ||
  origin.endsWith(".vercel.app");

export const middlewareCors = cors({
  origin(origin, callback) {
    if (isAllowed(origin)) return callback(null, true);
    callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
});
