// routes/auth.mjs
// Rutas de autenticación montadas sobre un modelo de usuarios inyectado.
import { Router } from "express";
import { AuthController } from "../controllers/auth.mjs";
import { asyncHandler } from "../middlewares/async-handler.mjs";
import { validate } from "../middlewares/validate.mjs";
import { registerSchema, loginSchema } from "../schemas/auth.mjs";

export const createAuthRouter = ({ userModel }) => {
  const router = Router();
  const controller = new AuthController({ userModel });

  // POST /auth/register — crea una cuenta y devuelve un JWT.
  router.post("/register", validate(registerSchema), asyncHandler(controller.register));

  // POST /auth/login — intercambia credenciales por un JWT.
  router.post("/login", validate(loginSchema), asyncHandler(controller.login));

  return router;
};
