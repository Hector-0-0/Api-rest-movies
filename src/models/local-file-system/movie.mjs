//movies.mjs

// Modelo en memoria respaldado por el JSON semilla. Sirve para correr en local
// sin base de datos y como backend rápido y aislado para los tests. Expone el
// mismo contrato que el modelo de PostgreSQL, así que el controlador es
// indiferente al origen de los datos; tests/models.contract.test.mjs pasa la
// misma suite por los dos.
import seed from "../../movies.json" with { type: "json" };
import crypto from "node:crypto";
import { SORTABLE_FIELDS } from "../../schemas/movies.mjs";

// Trabajamos sobre una copia para no mutar nunca el archivo semilla.
let movies = structuredClone(seed);

export class MovieModel {
  /** Restaura el almacén en memoria a la semilla original (útil entre tests). */
  static reset() {
    movies = structuredClone(seed);
  }

  static async getAll({ genre, page = 1, limit = 10, sort } = {}) {
    let result = movies;

    if (genre) {
      result = result.filter((movie) =>
        movie.genre?.some((g) => g.toLowerCase() === genre.toLowerCase()),
      );
    }

    if (sort) {
      const direction = sort.startsWith("-") ? -1 : 1;
      const field = sort.replace(/^-/, "");
      if (SORTABLE_FIELDS.includes(field)) {
        result = [...result].sort((a, b) => {
          if (a[field] < b[field]) return -1 * direction;
          if (a[field] > b[field]) return 1 * direction;
          return 0;
        });
      }
    }

    const total = result.length;
    const offset = (page - 1) * limit;
    return { data: result.slice(offset, offset + limit), total };
  }

  static async getById(id) {
    return movies.find((movie) => movie.id === id) ?? null;
  }

  static async create(movieData) {
    // `rate` es opcional en el esquema pero NOT NULL en la base, donde por
    // defecto vale 0. Lo replicamos aquí para que ambos backends coincidan.
    const newMovie = { id: crypto.randomUUID(), ...movieData, rate: movieData.rate ?? 0 };
    movies.push(newMovie);
    return newMovie;
  }

  static async update(id, updateData) {
    const index = movies.findIndex((movie) => movie.id === id);
    if (index === -1) return false;

    movies[index] = { ...movies[index], ...updateData };
    return movies[index];
  }

  static async delete(id) {
    const index = movies.findIndex((movie) => movie.id === id);
    if (index === -1) return 0;

    movies.splice(index, 1);
    return 1;
  }
}
