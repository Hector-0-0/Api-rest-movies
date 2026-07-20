// models/database/user.mjs
// Persistencia de usuarios en PostgreSQL. Los ids son columnas uuid nativas y
// las contraseñas se guardan solo como hash bcrypt: aquí nunca circula texto plano.
//
// Los emails se comparan sin distinguir mayúsculas. La colación por defecto de
// MySQL lo hacía sola; PostgreSQL compara texto tal cual, así que normalizamos
// a minúsculas y lo respaldamos con un UNIQUE INDEX sobre LOWER(email)
// (ver schema.sql). Sin esto, foo@x.com y Foo@x.com serían dos cuentas distintas.
import { pool } from "../../db/connection.mjs";

export class UserModel {
  /**
   * Busca un usuario por email, incluyendo el hash para que la capa de auth
   * pueda verificar credenciales. Devuelve null si no hay coincidencia.
   */
  static async findByEmail(email) {
    try {
      const { rows } = await pool.query(
        `SELECT id, email, password_hash, role
         FROM users WHERE LOWER(email) = LOWER($1)`,
        [email],
      );
      return rows[0] ?? null;
    } catch (error) {
      console.error("Error de base de datos en findByEmail:", error.message);
      throw new Error("Error al obtener el usuario", { cause: error });
    }
  }

  /**
   * Crea un usuario a partir de una contraseña ya hasheada. Devuelve la vista
   * pública del usuario (sin el hash).
   */
  static async create({ email, passwordHash, role = "user" }) {
    try {
      const { rows } = await pool.query(
        `INSERT INTO users (email, password_hash, role)
         VALUES (LOWER($1), $2, $3)
         RETURNING id, email, role`,
        [email, passwordHash, role],
      );
      return rows[0];
    } catch (error) {
      console.error("Error de base de datos al crear usuario:", error.message);
      throw new Error("Error al crear el usuario", { cause: error });
    }
  }
}
