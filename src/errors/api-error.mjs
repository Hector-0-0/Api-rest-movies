// src/errors/api-error.mjs
// Error de aplicación que lleva un status HTTP y un código legible por máquina.
// Lanzarlos desde cualquier capa permite que el manejador central arme una
// respuesta JSON consistente, sin que cada capa haga su propio res.status().

export class ApiError extends Error {
  /**
   * @param {number} statusCode - Status HTTP (p. ej. 404).
   * @param {string} code - Código estable legible por máquina (p. ej. "NOT_FOUND").
   * @param {string} message - Mensaje legible por humanos.
   * @param {Array} [details] - Info extra opcional (p. ej. errores de validación).
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
