// src/middlewares/async-handler.mjs
// Envuelve un handler asíncrono para que cualquier promesa rechazada llegue al
// manejador de errores central vía next(err), en lugar de quedar como unhandled
// rejection. Ahorra try/catch repetidos en los controladores.

export const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
