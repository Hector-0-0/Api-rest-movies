//schemas/movies.mjs

// Esquemas Zod: la única fuente de verdad sobre la forma de los datos de una
// película y de los parámetros que acepta el endpoint de listado.
import { z } from "zod";

// Géneros permitidos en toda la API. Viven aquí para que el esquema y la
// semilla de la base no se desalineen: cada valor debe existir también en la
// tabla `genre` que siembra schema.sql.
export const GENRES = [
  "Action",
  "Adventure",
  "Animation",
  "Biography",
  "Crime",
  "Comedy",
  "Drama",
  "Fantasy",
  "Horror",
  "Sci-Fi",
  "Romance",
];

// Campos por los que se puede ordenar el listado. La whitelist evita inyección
// SQL cuando el valor se interpola dentro de un ORDER BY.
export const SORTABLE_FIELDS = ["title", "year", "duration", "rate"];

const currentYear = new Date().getFullYear();

/**
 * movieSchema: el contrato que toda película debe cumplir.
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
 * listMoviesQuerySchema: valida y convierte la query string de GET /movies.
 * Los strings de la URL se convierten a número y se aplican valores por
 * defecto, para que el controlador siempre reciba datos limpios.
 */
export const listMoviesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  genre: z.enum(GENRES).optional(),
  // Búsqueda libre sobre el título (sin distinguir mayúsculas, parcial).
  // Un valor vacío se trata como "sin búsqueda" en vez de error de validación,
  // así una UI puede mandar `q=` siempre.
  q: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => value || undefined),
  // Ordena por un campo de la whitelist; el prefijo "-" es descendente (p. ej. -rate).
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
 * Helpers de compatibilidad (los siguen usando el modelo en memoria y los tests).
 */
export function validateMovie(input) {
  return movieSchema.safeParse(input);
}

export function validatePartialMovie(input) {
  return movieSchema.partial().safeParse(input);
}

export const partialMovieSchema = movieSchema.partial();
