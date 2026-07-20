//movies.mjs

// MovieController: capa HTTP fina sobre el modelo inyectado. La entrada ya viene
// validada por middleware, así que los handlers solo orquestan y lanzan ApiError
// ante fallos (el manejador central se encarga de darle forma a la respuesta).
import { ApiError } from "../errors/api-error.mjs";

export class MovieController {
  constructor({ movieModel }) {
    this.movieModel = movieModel;
  }

  // Los métodos flecha mantienen `this` atado al pasarlos como referencia de ruta.

  getAll = async (req, res) => {
    const { page, limit, genre, sort, q } = req.query;

    const { data, total } = await this.movieModel.getAll({
      page,
      limit,
      genre,
      sort,
      q,
    });

    // La metadata de paginación viaja en cabeceras para que el cuerpo siga
    // siendo un array plano. Las exponemos para que el navegador pueda leerlas.
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
