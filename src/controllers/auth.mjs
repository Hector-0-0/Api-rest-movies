// controllers/auth.mjs
// HTTP layer for authentication. Hashes passwords with bcrypt on register and
// verifies them on login, returning a signed JWT. Input is already validated
// by middleware, so handlers focus on orchestration.
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
    // Same response whether the email is unknown or the password is wrong,
    // so we don't leak which emails exist.
    const valid = user && (await bcrypt.compare(password, user.password_hash));
    if (!valid) throw ApiError.unauthorized("Invalid email or password");

    const publicUser = { id: user.id, email: user.email, role: user.role };
    const token = signToken(publicUser);
    res.json({ user: publicUser, token });
  };
}
