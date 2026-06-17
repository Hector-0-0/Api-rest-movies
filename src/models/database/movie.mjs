//movie.mjs

// Reutilizamos el pool de conexiones compartido (ver src/db/connection.mjs).
// Un pool tolera desconexiones por inactividad y peticiones concurrentes,
// algo necesario en bases gestionadas como Aiven.
import { pool as connection } from "../../db/connection.mjs";
import { SORTABLE_FIELDS } from "../../schemas/movies.mjs";

export class MovieModel {
  /**
   * Lista películas con paginación, filtro por género y ordenamiento.
   * @param {Object} options
   * @param {string} [options.genre] - Filtra por nombre de género.
   * @param {number} [options.page=1]
   * @param {number} [options.limit=10]
   * @param {string} [options.sort] - Campo de orden; prefijo "-" = descendente.
   * @returns {Promise<{ data: Array, total: number }>}
   */
  static async getAll({ genre, page = 1, limit = 10, sort } = {}) {
    try {
      const offset = (page - 1) * limit;

      // ORDER BY a partir de un campo de la whitelist (evita inyección).
      let orderBy = "";
      if (sort) {
        const direction = sort.startsWith("-") ? "DESC" : "ASC";
        const field = sort.replace(/^-/, "");
        if (SORTABLE_FIELDS.includes(field)) {
          orderBy = `ORDER BY m.${field} ${direction}`;
        }
      }

      // Filtro por género: resolvemos el JOIN con la tabla intermedia.
      const genreJoin = genre
        ? "JOIN movie_genres mg ON m.id = mg.movie_id JOIN genre g ON g.id = mg.genre_id"
        : "";
      const where = genre ? "WHERE LOWER(g.name) = ?" : "";
      const filterParams = genre ? [genre.toLowerCase()] : [];

      // Total de coincidencias (para la metadata de paginación).
      const [[{ total }]] = await connection.query(
        `SELECT COUNT(DISTINCT m.id) AS total FROM movie m ${genreJoin} ${where}`,
        filterParams,
      );

      // Página de resultados.
      const [rows] = await connection.query(
        `SELECT m.title, m.year, m.director, m.duration, m.poster, m.rate, BIN_TO_UUID(m.id) id
         FROM movie m
         ${genreJoin}
         ${where}
         ${orderBy}
         LIMIT ? OFFSET ?`,
        [...filterParams, limit, offset],
      );

      return { data: rows, total };
    } catch (error) {
      console.error("Database error in getAll:", error.message);
      throw new Error("Error retrieving movies from database");
    }
  }

  static async getById(id) {
    try {
      // Convertimos el UUID de texto a BINARIO para que MySQL pueda encontrarlo
      const [rows] = await connection.query(
        `SELECT title, year, director, duration, poster, rate, BIN_TO_UUID(id) id 
         FROM movie WHERE id = UUID_TO_BIN(?)`,
        [id],
      );

      if (rows.length === 0) return null;
      return rows[0];
    } catch (error) {
      console.error("Database error in getById:", error.message);
      throw new Error("Error retrieving movie from database");
    }
  }

  static async create(movieData) {
    const conn = await connection.getConnection();
    try {
      const { title, year, director, duration, poster, rate, genre } = movieData;

      await conn.beginTransaction();

      // Generamos un UUID nuevo directamente en MySQL
      const [[{ uuid: uuidValue }]] = await conn.query("SELECT UUID() AS uuid");

      // Insertamos convirtiendo el UUID string a binario
      await conn.query(
        "INSERT INTO movie (id, title, year, director, duration, poster, rate) VALUES (UUID_TO_BIN(?), ?, ?, ?, ?, ?, ?)",
        [uuidValue, title, year, director, duration, poster, rate],
      );

      // Enlazamos los géneros en la tabla intermedia.
      await this.#syncGenres(conn, uuidValue, genre);

      await conn.commit();

      // Retornamos la película recién creada para confirmar el registro
      return await this.getById(uuidValue);
    } catch (error) {
      await conn.rollback();
      console.error("Database error in create:", error.message);
      throw new Error("Error creating movie in database");
    } finally {
      conn.release();
    }
  }

  /**
   * Reemplaza los géneros de una película dentro de una transacción.
   * Resuelve nombres → ids contra la tabla `genre` (whitelist ya validada
   * por Zod, así que todos deberían existir).
   */
  static async #syncGenres(conn, id, genres) {
    if (!genres || genres.length === 0) return;

    await conn.query(
      "DELETE FROM movie_genres WHERE movie_id = UUID_TO_BIN(?)",
      [id],
    );

    const [rows] = await conn.query(
      `SELECT id FROM genre WHERE name IN (${genres.map(() => "?").join(",")})`,
      genres,
    );
    if (rows.length === 0) return;

    await conn.query(
      `INSERT INTO movie_genres (movie_id, genre_id) VALUES ${rows
        .map(() => "(UUID_TO_BIN(?), ?)")
        .join(", ")}`,
      rows.flatMap((row) => [id, row.id]),
    );
  }

  static async update(id, updateData) {
    const conn = await connection.getConnection();
    try {
      const currentMovie = await this.getById(id);
      if (!currentMovie) return false;

      await conn.beginTransaction();

      // Lógica de "Mezcla": Si el dato no viene en el update, mantenemos el actual
      const updatedData = {
        title: updateData.title ?? currentMovie.title,
        year: updateData.year ?? currentMovie.year,
        director: updateData.director ?? currentMovie.director,
        duration: updateData.duration ?? currentMovie.duration,
        poster: updateData.poster ?? currentMovie.poster,
        rate: updateData.rate ?? currentMovie.rate,
      };

      await conn.query(
        "UPDATE movie SET title = ?, year = ?, director = ?, duration = ?, poster = ?, rate = ? WHERE id = UUID_TO_BIN(?)",
        [
          updatedData.title,
          updatedData.year,
          updatedData.director,
          updatedData.duration,
          updatedData.poster,
          updatedData.rate,
          id,
        ],
      );

      // Solo tocamos los géneros si el cliente los envió.
      if (updateData.genre) {
        await this.#syncGenres(conn, id, updateData.genre);
      }

      await conn.commit();

      return await this.getById(id);
    } catch (error) {
      await conn.rollback();
      console.error("Database error in update:", error.message);
      throw new Error("Error updating movie in database");
    } finally {
      conn.release();
    }
  }

  static async delete(id) {
    try {
      // El resultado contiene 'affectedRows' para saber si realmente se borró algo
      const [result] = await connection.query(
        "DELETE FROM movie WHERE id = UUID_TO_BIN(?)",
        [id],
      );
      return result.affectedRows;
    } catch (error) {
      console.error("Database error in delete:", error.message);
      throw new Error("Error deleting movie from database");
    }
  }
}
