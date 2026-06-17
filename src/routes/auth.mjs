// routes/auth.mjs
// Authentication routes wired around an injected user model.
import { Router } from "express";
import { AuthController } from "../controllers/auth.mjs";
import { asyncHandler } from "../middlewares/async-handler.mjs";
import { validate } from "../middlewares/validate.mjs";
import { registerSchema, loginSchema } from "../schemas/auth.mjs";

export const createAuthRouter = ({ userModel }) => {
  const router = Router();
  const controller = new AuthController({ userModel });

  // POST /auth/register — create an account and return a JWT.
  router.post("/register", validate(registerSchema), asyncHandler(controller.register));

  // POST /auth/login — exchange credentials for a JWT.
  router.post("/login", validate(loginSchema), asyncHandler(controller.login));

  return router;
};
