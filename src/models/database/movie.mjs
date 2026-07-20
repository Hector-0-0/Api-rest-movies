// models/database/movie.mjs
// Modelo de películas sobre PostgreSQL. Usa el pool compartido
// (ver src/db/connection.mjs), que tolera las desconexiones por inactividad de
// proveedores serverless como Neon.
//
// Expone exactamente el mismo contrato que el modelo en memoria: los dos pasan
// por la misma suite en tests/models.contract.test.mjs.
import { pool } from "../../db/connection.mjs";
import { SORTABLE_FIELDS } from "../../schemas/movies.mjs";

// Columnas que devuelve toda lectura. `rate` se castea a float8 porque node-pg
// mapea NUMERIC a string para no perder precisión, y el contrato de la API dice
// que rate es un número. Los géneros se agregan en un array de verdad: node-pg
// decodifica text[] como array de JS, así que no hay que partir strings.
const MOVIE_COLUMNS = `
  m.id,
  m.title,
  m.year,
  m.director,
  m.duration,
  m.poster,
  m.rate::float8 AS rate,
  COALESCE(
    ARRAY(
      SELECT g.name
      FROM movie_genres mg
      JOIN genre g ON g.id = mg.genre_id
      WHERE mg.movie_id = m.id
      ORDER BY g.name
    ),
    '{}'
  ) AS genre`;

export class MovieModel {
  /**
   * Lista películas con paginación, filtro por género y orden.
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

      // El ORDER BY se arma con un campo de la whitelist (evita inyección SQL).
      let orderBy = "";
      if (sort) {
        const direction = sort.startsWith("-") ? "DESC" : "ASC";
        const field = sort.replace(/^-/, "");
        if (SORTABLE_FIELDS.includes(field)) {
          orderBy = `ORDER BY m.${field} ${direction}`;
        }
      }

      // Recogemos el filtro en una lista para mantener correcta la numeración
      // de los placeholders.
      const conditions = [];
      const filterParams = [];

      if (genre) {
        filterParams.push(genre);
        // EXISTS en vez de JOIN: así una película con varios géneros nunca se
        // duplica y el conteo sale bien sin necesidad de DISTINCT.
        conditions.push(`EXISTS (
          SELECT 1 FROM movie_genres mg
          JOIN genre g ON g.id = mg.genre_id
          WHERE mg.movie_id = m.id AND LOWER(g.name) = LOWER($${filterParams.length})
        )`);
      }

      const where = conditions.length
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

      const { rows: countRows } = await pool.query(
        `SELECT COUNT(*)::int AS total FROM movie m ${where}`,
        filterParams,
      );

      const { rows } = await pool.query(
        `SELECT ${MOVIE_COLUMNS}
         FROM movie m
         ${where}
         ${orderBy}
         LIMIT $${filterParams.length + 1} OFFSET $${filterParams.length + 2}`,
        [...filterParams, limit, offset],
      );

      return { data: rows, total: countRows[0].total };
    } catch (error) {
      console.error("Error de base de datos en getAll:", error.message);
      throw new Error("Error al obtener las películas", { cause: error });
    }
  }

  static async getById(id) {
    try {
      const { rows } = await pool.query(
        `SELECT ${MOVIE_COLUMNS} FROM movie m WHERE m.id = $1`,
        [id],
      );
      return rows[0] ?? null;
    } catch (error) {
      // Un id que no es un UUID válido hace que PostgreSQL lance 22P02
      // (invalid_text_representation). Eso es un "no encontrado", no un 500.
      if (error.code === "22P02") return null;
      console.error("Error de base de datos en getById:", error.message);
      throw new Error("Error al obtener la película", { cause: error });
    }
  }

  static async create(movieData) {
    const client = await pool.connect();
    try {
      const { title, year, director, duration, poster, rate, genre } = movieData;

      await client.query("BEGIN");

      // RETURNING nos da el id generado sin una segunda ida a la base.
      const { rows } = await client.query(
        `INSERT INTO movie (title, year, director, duration, poster, rate)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [title, year, director, duration, poster, rate ?? 0],
      );
      const id = rows[0].id;

      await this.#syncGenres(client, id, genre);

      await client.query("COMMIT");

      return await this.getById(id);
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error de base de datos en create:", error.message);
      throw new Error("Error al crear la película", { cause: error });
    } finally {
      client.release();
    }
  }

  /**
   * Reemplaza los géneros de una película dentro de una transacción. Resuelve
   * nombres → ids contra la tabla `genre` (Zod ya validó contra la whitelist,
   * así que se espera que todos existan).
   */
  static async #syncGenres(client, id, genres) {
    if (!genres) return;

    await client.query("DELETE FROM movie_genres WHERE movie_id = $1", [id]);

    if (genres.length === 0) return;

    // Una sola sentencia: selecciona los ids que coinciden e inserta los pares.
    await client.query(
      `INSERT INTO movie_genres (movie_id, genre_id)
       SELECT $1, g.id FROM genre g WHERE g.name = ANY($2::text[])
       ON CONFLICT DO NOTHING`,
      [id, genres],
    );
  }

  static async update(id, updateData) {
    const client = await pool.connect();
    try {
      const currentMovie = await this.getById(id);
      if (!currentMovie) return false;

      await client.query("BEGIN");

      // Lógica de mezcla: lo que no venga en el update conserva su valor actual.
      const merged = {
        title: updateData.title ?? currentMovie.title,
        year: updateData.year ?? currentMovie.year,
        director: updateData.director ?? currentMovie.director,
        duration: updateData.duration ?? currentMovie.duration,
        poster: updateData.poster ?? currentMovie.poster,
        rate: updateData.rate ?? currentMovie.rate,
      };

      await client.query(
        `UPDATE movie
         SET title = $1, year = $2, director = $3,
             duration = $4, poster = $5, rate = $6
         WHERE id = $7`,
        [
          merged.title,
          merged.year,
          merged.director,
          merged.duration,
          merged.poster,
          merged.rate,
          id,
        ],
      );

      // Solo tocamos los géneros si el cliente los envió.
      if (updateData.genre) {
        await this.#syncGenres(client, id, updateData.genre);
      }

      await client.query("COMMIT");

      return await this.getById(id);
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error de base de datos en update:", error.message);
      throw new Error("Error al actualizar la película", { cause: error });
    } finally {
      client.release();
    }
  }

  static async delete(id) {
    try {
      // Las filas de movie_genres caen solas por el ON DELETE CASCADE.
      const { rowCount } = await pool.query("DELETE FROM movie WHERE id = $1", [
        id,
      ]);
      return rowCount;
    } catch (error) {
      if (error.code === "22P02") return 0;
      console.error("Error de base de datos en delete:", error.message);
      throw new Error("Error al eliminar la película", { cause: error });
    }
  }
}
