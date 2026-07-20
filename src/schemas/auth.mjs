// schemas/auth.mjs
// Esquemas Zod de los endpoints de autenticación. Son la única fuente de verdad
// sobre cómo debe ser un payload válido de registro o de login.
import { z } from "zod";

/**
 * registerSchema: contrato de POST /auth/register.
 * El largo mínimo se exige aquí para que una contraseña débil nunca llegue a bcrypt.
 */
export const registerSchema = z.object({
  email: z.string().email({ message: "A valid email is required" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long" })
    .max(72, { message: "Password must be at most 72 characters long" }),
});

/**
 * loginSchema: contrato de POST /auth/login. Aquí solo comprobamos que los
 * campos vengan; que las credenciales sean correctas se verifica contra la base.
 */
export const loginSchema = z.object({
  email: z.string().email({ message: "A valid email is required" }),
  password: z.string().min(1, { message: "Password is required" }),
});
