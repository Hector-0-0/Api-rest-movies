//routes/movies.mjs

import { Router } from "express";
import { MovieController } from "../controllers/movies.mjs";
import { asyncHandler } from "../middlewares/async-handler.mjs";
import { validate } from "../middlewares/validate.mjs";
import {
  movieSchema,
  partialMovieSchema,
  listMoviesQuerySchema,
} from "../schemas/movies.mjs";

/**
 * createMovieRouter: factory that wires the movies routes around an injected
 * model. Validation runs as middleware before each handler.
 */
export const createMovieRouter = ({ movieModel }) => {
  const router = Router();
  const controller = new MovieController({ movieModel });

  // GET /movies?page&limit&genre&sort — list with pagination/filter/sort
  router.get(
    "/",
    validate(listMoviesQuerySchema, "query"),
    asyncHandler(controller.getAll),
  );

  // GET /movies/:id
  router.get("/:id", asyncHandler(controller.getById));

  // POST /movies
  router.post("/", validate(movieSchema), asyncHandler(controller.create));

  // PATCH /movies/:id — partial update
  router.patch(
    "/:id",
    validate(partialMovieSchema),
    asyncHandler(controller.update),
  );

  // DELETE /movies/:id
  router.delete("/:id", asyncHandler(controller.delete));

  return router;
};
