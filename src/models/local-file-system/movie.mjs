//movies.mjs

// In-memory model backed by the seed JSON. Useful for local runs without a
// database and as a fast, isolated backend for tests. Its method contract
// mirrors the MySQL model so the controller is agnostic to the data source.
import seed from "../../movies.json" with { type: "json" };
import crypto from "node:crypto";
import { SORTABLE_FIELDS } from "../../schemas/movies.mjs";

// Work on a copy so the seed file is never mutated at runtime.
let movies = structuredClone(seed);

export class MovieModel {
  /** Resets the in-memory store to the original seed (handy for tests). */
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
    const newMovie = { id: crypto.randomUUID(), ...movieData };
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
