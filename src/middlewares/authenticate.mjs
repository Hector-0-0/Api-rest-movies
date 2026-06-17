// middlewares/authenticate.mjs
// Authentication (who are you?) and authorization (are you allowed?) guards.
// `authenticate` requires a valid Bearer JWT and attaches the user to req.user.
// `authorize(...roles)` restricts a route to the given roles.
import { ApiError } from "../errors/api-error.mjs";
import { verifyToken } from "../auth/jwt.mjs";

export const authenticate = (req, res, next) => {
  const header = req.headers.authorization ?? "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(ApiError.unauthorized("Missing or malformed Authorization header"));
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch {
    next(ApiError.unauthorized("Invalid or expired token"));
  }
};

/** Allows the request only if req.user.role is one of the given roles. */
export const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(ApiError.forbidden("You do not have permission to perform this action"));
    }
    next();
  };
