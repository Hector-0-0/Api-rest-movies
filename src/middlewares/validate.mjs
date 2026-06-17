// src/middlewares/validate.mjs
// Factory that builds a validation middleware from a Zod schema. On success
// the parsed (and coerced) data replaces the original source so controllers
// always read clean, typed values. On failure it throws a 422 ApiError.

import { ApiError } from "../errors/api-error.mjs";

/**
 * @param {import("zod").ZodTypeAny} schema - Zod schema to validate against.
 * @param {"body" | "query" | "params"} [source="body"] - Request part to read.
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

    // In Express 5 req.query is a re-parsing getter on the prototype, so a
    // plain assignment doesn't stick. Define an own property to override it
    // with the validated/coerced values for the rest of the chain.
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
