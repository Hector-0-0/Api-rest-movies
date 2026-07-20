// models/local-file-system/user.mjs
// Almacén de usuarios en memoria que replica el contrato del modelo de
// PostgreSQL. Se usa en local sin base de datos y como backend para los tests.
import crypto from "node:crypto";

let users = [];

export class UserModel {
  /** Vacía el almacén (útil entre tests). */
  static reset() {
    users = [];
  }

  // Los emails se guardan y comparan en minúsculas, igual que el modelo de
  // PostgreSQL y su UNIQUE INDEX sobre LOWER(email).
  static async findByEmail(email) {
    const needle = email.toLowerCase();
    return users.find((user) => user.email === needle) ?? null;
  }

  static async create({ email, passwordHash, role = "user" }) {
    const user = {
      id: crypto.randomUUID(),
      email: email.toLowerCase(),
      password_hash: passwordHash,
      role,
    };
    users.push(user);
    return { id: user.id, email: user.email, role: user.role };
  }
}
