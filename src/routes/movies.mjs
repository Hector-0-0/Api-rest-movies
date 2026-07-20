//routes/movies.mjs

import { Router } from "express";
import { MovieController } from "../controllers/movies.mjs";
import { asyncHandler } from "../middlewares/async-handler.mjs";
import { validate } from "../middlewares/validate.mjs";
import { authenticate, authorize } from "../middlewares/authenticate.mjs";
import {
  movieSchema,
  partialMovieSchema,
  listMoviesQuerySchema,
} from "../schemas/movies.mjs";

/**
 * createMovieRouter: factory que monta las rutas de películas alrededor de un
 * modelo inyectado. La validación corre como middleware antes de cada handler.
 * Las lecturas son públicas; las escrituras exigen un admin autenticado.
 */
export const createMovieRouter = ({ movieModel }) => {
  const router = Router();
  const controller = new MovieController({ movieModel });

  // Cadena de guardas que reutilizan todas las escrituras: admin autenticado.
  const adminOnly = [authenticate, authorize("admin")];

  // GET /movies?q&page&limit&genre&sort — listado con búsqueda, filtro y orden
  router.get(
    "/",
    validate(listMoviesQuerySchema, "query"),
    asyncHandler(controller.getAll),
  );

  // GET /movies/:id
  router.get("/:id", asyncHandler(controller.getById));

  // POST /movies
  router.post(
    "/",
    ...adminOnly,
    validate(movieSchema),
    asyncHandler(controller.create),
  );

  // PATCH /movies/:id — actualización parcial
  router.patch(
    "/:id",
    ...adminOnly,
    validate(partialMovieSchema),
    asyncHandler(controller.update),
  );

  // DELETE /movies/:id
  router.delete("/:id", ...adminOnly, asyncHandler(controller.delete));

  return router;
};
