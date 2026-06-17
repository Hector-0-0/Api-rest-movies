// models/local-file-system/user.mjs
// In-memory user store mirroring the MySQL model's contract. Used for local
// runs without a database and as an isolated backend for tests.
import crypto from "node:crypto";

let users = [];

export class UserModel {
  /** Clears the store (handy between tests). */
  static reset() {
    users = [];
  }

  static async findByEmail(email) {
    return users.find((user) => user.email === email) ?? null;
  }

  static async create({ email, passwordHash, role = "user" }) {
    const user = {
      id: crypto.randomUUID(),
      email,
      password_hash: passwordHash,
      role,
    };
    users.push(user);
    return { id: user.id, email: user.email, role: user.role };
  }
}
