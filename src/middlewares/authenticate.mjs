// middlewares/authenticate.mjs
// Guardas de autenticación (¿quién eres?) y autorización (¿puedes hacerlo?).
// `authenticate` exige un JWT Bearer válido y cuelga el usuario en req.user.
// `authorize(...roles)` restringe una ruta a los roles indicados.
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

/** Deja pasar la petición solo si req.user.role está entre los roles dados. */
export const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(ApiError.forbidden("You do not have permission to perform this action"));
    }
    next();
  };
