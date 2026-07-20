// controllers/auth.mjs
// Capa HTTP de autenticación. Hashea contraseñas con bcrypt al registrar y las
// verifica al iniciar sesión, devolviendo un JWT firmado. La entrada ya viene
// validada por middleware, así que los handlers solo orquestan.
import bcrypt from "bcryptjs";
import { ApiError } from "../errors/api-error.mjs";
import { config } from "../config/index.mjs";
import { signToken } from "../auth/jwt.mjs";

export class AuthController {
  constructor({ userModel }) {
    this.userModel = userModel;
  }

  register = async (req, res) => {
    const { email, password } = req.body;

    const existing = await this.userModel.findByEmail(email);
    if (existing) throw ApiError.conflict("Email is already registered");

    const passwordHash = await bcrypt.hash(password, config.auth.bcryptRounds);
    const user = await this.userModel.create({ email, passwordHash });

    const token = signToken(user);
    res.status(201).json({ user, token });
  };

  login = async (req, res) => {
    const { email, password } = req.body;

    const user = await this.userModel.findByEmail(email);
    // Misma respuesta tanto si el email no existe como si la contraseña es
    // incorrecta, para no filtrar qué emails están registrados.
    const valid = user && (await bcrypt.compare(password, user.password_hash));
    if (!valid) throw ApiError.unauthorized("Invalid email or password");

    const publicUser = { id: user.id, email: user.email, role: user.role };
    const token = signToken(publicUser);
    res.json({ user: publicUser, token });
  };
}
