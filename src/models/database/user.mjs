// models/database/user.mjs
// Persistence for users. Mirrors the movie model conventions: UUIDs stored as
// BINARY(16) and exposed as text via BIN_TO_UUID. Passwords are stored only as
// bcrypt hashes — this layer never deals with plaintext.
import { pool as connection } from "../../db/connection.mjs";

export class UserModel {
  /**
   * Finds a user by email, including the password hash so the auth layer can
   * verify credentials. Returns null when no user matches.
   */
  static async findByEmail(email) {
    try {
      const [rows] = await connection.query(
        `SELECT BIN_TO_UUID(id) id, email, password_hash, role
         FROM users WHERE email = ?`,
        [email],
      );
      return rows[0] ?? null;
    } catch (error) {
      console.error("Database error in findByEmail:", error.message);
      throw new Error("Error retrieving user from database", { cause: error });
    }
  }

  /**
   * Creates a user from an already-hashed password. Returns the public view of
   * the user (no password hash).
   */
  static async create({ email, passwordHash, role = "user" }) {
    try {
      const [[{ uuid }]] = await connection.query("SELECT UUID() AS uuid");

      await connection.query(
        `INSERT INTO users (id, email, password_hash, role)
         VALUES (UUID_TO_BIN(?), ?, ?, ?)`,
        [uuid, email, passwordHash, role],
      );

      return { id: uuid, email, role };
    } catch (error) {
      console.error("Database error in create user:", error.message);
      throw new Error("Error creating user in database", { cause: error });
    }
  }
}
