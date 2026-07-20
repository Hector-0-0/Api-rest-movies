// src/middlewares/validate.mjs
// Factory que construye un middleware de validación a partir de un esquema Zod.
// Si valida, los datos parseados (y convertidos) reemplazan al origen, de modo
// que los controladores siempre leen valores limpios. Si no, lanza un 422.

import { ApiError } from "../errors/api-error.mjs";

/**
 * @param {import("zod").ZodTypeAny} schema - Esquema Zod contra el que validar.
 * @param {"body" | "query" | "params"} [source="body"] - Parte de la petición a leer.
 */
export const validate =
  (schema, source = "body") =>
  (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join(".") || "(root)",
        message: issue.message,
      }));
      return next(ApiError.validation("Invalid request data", details));
    }

    // En Express 5, req.query es un getter del prototipo que reparsea, así que
    // una asignación normal no persiste. Definimos una propiedad propia para
    // sobreescribirlo con los valores validados durante el resto de la cadena.
    if (source === "query") {
      Object.defineProperty(req, "query", {
        value: result.data,
        writable: true,
        configurable: true,
      });
    } else {
      req[source] = result.data;
    }
    next();
  };
