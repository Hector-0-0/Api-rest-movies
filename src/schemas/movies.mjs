//schemas/movies.mjs

// Zod schemas: the single source of truth for the shape of movie data and
// of the query parameters accepted by the list endpoint.
import { z } from "zod";

// Genres allowed across the API. Kept here so schema and DB seed stay aligned.
export const GENRES = [
  "Action",
  "Adventure",
  "Crime",
  "Comedy",
  "Drama",
  "Horror",
  "Sci-Fi",
  "Romance",
];

// Fields the list endpoint can be sorted by (whitelist prevents SQL injection
// when the value is interpolated into an ORDER BY clause).
export const SORTABLE_FIELDS = ["title", "year", "duration", "rate"];

const currentYear = new Date().getFullYear();

/**
 * movieSchema: the contract every movie must satisfy.
 */
export const movieSchema = z.object({
  title: z.string({ message: "Title must be a string" }).min(1),

  year: z
    .number()
    .int()
    .min(1900)
    .max(currentYear + 5),

  director: z.string().min(1),

  duration: z.number().int().positive(),

  rate: z.number().min(0).max(10).optional(),

  poster: z.string().url({ message: "Poster must be a valid URL" }),

  genre: z
    .array(z.enum(GENRES))
    .nonempty({ message: "Genre must be a non-empty array of valid genres" }),
});

/**
 * listMoviesQuerySchema: validates and coerces the query string of
 * GET /movies. Strings from the URL are coerced to numbers and defaults
 * are applied so the controller always gets clean values.
 */
export const listMoviesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  genre: z.enum(GENRES).optional(),
  // Sort by a whitelisted field; a leading "-" means descending (e.g. -rate).
  sort: z
    .string()
    .optional()
    .refine(
      (value) =>
        value === undefined ||
        SORTABLE_FIELDS.includes(value.replace(/^-/, "")),
      {
        message: `sort must be one of: ${SORTABLE_FIELDS.join(", ")} (prefix with - for descending)`,
      },
    ),
});

/**
 * Backwards-compatible helpers (still used by the in-memory model/tests).
 */
export function validateMovie(input) {
  return movieSchema.safeParse(input);
}

export function validatePartialMovie(input) {
  return movieSchema.partial().safeParse(input);
}

export const partialMovieSchema = movieSchema.partial();
