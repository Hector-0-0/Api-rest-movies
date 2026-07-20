// src/middlewares/error-handler.mjs
// Manejo central de errores: un handler de 404 para rutas desconocidas y un
// único manejador que convierte cualquier error lanzado en un JSON consistente:
//   { status, code, message, details? }

import { ApiError } from "../errors/api-error.mjs";
import { config } from "../config/index.mjs";

/** Captura las peticiones que no encajaron con ninguna ruta. */
export const notFoundHandler = (req, res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

/** Middleware de errores de Express (hay que mantener la firma de 4 argumentos). */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  // Los errores conocidos y esperados traen su propio status y code.
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      status: err.statusCode,
      code: err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  // Lo demás es un fallo inesperado: lo registramos y ocultamos los internos.
  console.error("Unexpected error:", err);

  return res.status(500).json({
    status: 500,
    code: "INTERNAL_SERVER_ERROR",
    message: "Something went wrong",
    // El mensaje real solo se expone fuera de producción, para depurar.
    ...(config.env !== "production" ? { details: err.message } : {}),
  });
};
