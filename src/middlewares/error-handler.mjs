// src/middlewares/error-handler.mjs
// Central error handling: a 404 handler for unknown routes and a single
// error handler that turns any thrown error into a consistent JSON shape:
//   { status, code, message, details? }

import { ApiError } from "../errors/api-error.mjs";
import { config } from "../config/index.mjs";

/** Catches requests that didn't match any route. */
export const notFoundHandler = (req, res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

/** Express error-handling middleware (must keep the 4-arg signature). */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  // Known, expected errors carry their own status/code.
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      status: err.statusCode,
      code: err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  // Anything else is an unexpected failure: log it and hide internals.
  console.error("Unexpected error:", err);

  return res.status(500).json({
    status: 500,
    code: "INTERNAL_SERVER_ERROR",
    message: "Something went wrong",
    // Surface the real message only outside production to aid debugging.
    ...(config.env !== "production" ? { details: err.message } : {}),
  });
};
