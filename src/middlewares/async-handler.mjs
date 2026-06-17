// src/middlewares/async-handler.mjs
// Wraps an async route handler so any rejected promise is forwarded to the
// central error handler via next(err), instead of becoming an unhandled
// rejection. Keeps controllers free of repetitive try/catch blocks.

export const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
