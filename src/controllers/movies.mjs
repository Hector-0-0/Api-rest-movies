//movies.mjs

// MovieController: thin HTTP layer over the injected model. Input is already
// validated by middleware, so handlers focus on orchestration and use
// ApiError for failures (the central error handler shapes the response).
import { ApiError } from "../errors/api-error.mjs";

export class MovieController {
  constructor({ movieModel }) {
    this.movieModel = movieModel;
  }

  // Arrow methods keep `this` bound when passed as route references.

  getAll = async (req, res) => {
    const { page, limit, genre, sort } = req.query;

    const { data, total } = await this.movieModel.getAll({
      page,
      limit,
      genre,
      sort,
    });

    // Pagination metadata travels in headers so the body stays a plain array
    // (keeps existing clients working). Headers are exposed for browsers.
    const totalPages = Math.ceil(total / limit) || 0;
    res.set("X-Total-Count", String(total));
    res.set("X-Total-Pages", String(totalPages));
    res.set("X-Page", String(page));
    res.set("X-Limit", String(limit));
    res.set(
      "Access-Control-Expose-Headers",
      "X-Total-Count, X-Total-Pages, X-Page, X-Limit",
    );

    res.json(data);
  };

  getById = async (req, res) => {
    const movie = await this.movieModel.getById(req.params.id);
    if (!movie) throw ApiError.notFound("Movie not found");
    res.json(movie);
  };

  create = async (req, res) => {
    const newMovie = await this.movieModel.create(req.body);
    res.status(201).json(newMovie);
  };

  update = async (req, res) => {
    const updatedMovie = await this.movieModel.update(req.params.id, req.body);
    if (updatedMovie === false) throw ApiError.notFound("Movie not found");
    res.json(updatedMovie);
  };

  delete = async (req, res) => {
    const removed = await this.movieModel.delete(req.params.id);
    if (!removed) throw ApiError.notFound("Movie not found");
    res.status(204).send();
  };
}
