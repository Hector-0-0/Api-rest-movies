// schemas/auth.mjs
// Zod schemas for the authentication endpoints. They are the single source of
// truth for what a valid register/login payload looks like.
import { z } from "zod";

/**
 * registerSchema: contract for POST /auth/register.
 * Password length is enforced here so weak passwords never reach bcrypt.
 */
export const registerSchema = z.object({
  email: z.string().email({ message: "A valid email is required" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long" })
    .max(72, { message: "Password must be at most 72 characters long" }),
});

/**
 * loginSchema: contract for POST /auth/login. We only check that the fields
 * are present; credential correctness is verified against the database.
 */
export const loginSchema = z.object({
  email: z.string().email({ message: "A valid email is required" }),
  password: z.string().min(1, { message: "Password is required" }),
});
