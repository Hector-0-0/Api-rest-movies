// src/errors/api-error.mjs
// Application-level error carrying an HTTP status and a machine-readable code.
// Throwing these anywhere lets the central error handler build a consistent
// JSON response without each layer crafting its own res.status(...).json(...).

export class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status (e.g. 404).
   * @param {string} code - Stable machine-readable code (e.g. "NOT_FOUND").
   * @param {string} message - Human-readable message.
   * @param {Array} [details] - Optional extra info (e.g. validation issues).
   */
  constructor(statusCode, code, message, details) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(message, details) {
    return new ApiError(400, "BAD_REQUEST", message, details);
  }

  static unauthorized(message = "Unauthorized") {
    return new ApiError(401, "UNAUTHORIZED", message);
  }

  static forbidden(message = "Forbidden") {
    return new ApiError(403, "FORBIDDEN", message);
  }

  static notFound(message = "Resource not found") {
    return new ApiError(404, "NOT_FOUND", message);
  }

  static conflict(message) {
    return new ApiError(409, "CONFLICT", message);
  }

  static validation(message, details) {
    return new ApiError(422, "VALIDATION_ERROR", message, details);
  }
}
