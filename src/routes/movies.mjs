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
 * createMovieRouter: factory that wires the movies routes around an injected
 * model. Validation runs as middleware before each handler. Reads are public;
 * writes require an authenticated admin (JWT Bearer token).
 */
export const createMovieRouter = ({ movieModel }) => {
  const router = Router();
  const controller = new MovieController({ movieModel });

  // Guard chain reused by every write route: must be a logged-in admin.
  const adminOnly = [authenticate, authorize("admin")];

  // GET /movies?page&limit&genre&sort — list with pagination/filter/sort
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

  // PATCH /movies/:id — partial update
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
