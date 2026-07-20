// src/app.mjs
// Construye y configura la aplicación Express. NO arranca el servidor: separar
// la definición de la app del `listen()` permite que los tests la importen y la
// ejecuten con Supertest sin abrir un puerto.

import express from "express";
import helmet from "helmet";
import { fileURLToPath } from "node:url";
import swaggerUi from "swagger-ui-express";
import { createMovieRouter } from "./routes/movies.mjs";
import { createAuthRouter } from "./routes/auth.mjs";
import { openapiSpec } from "./docs/openapi.mjs";
import { middlewareCors } from "./middlewares/cors.mjs";
import { apiRateLimiter } from "./middlewares/rate-limit.mjs";
import { notFoundHandler, errorHandler } from "./middlewares/error-handler.mjs";

/**
 * createApp: factory que monta middlewares y rutas alrededor de los modelos
 * inyectados, para que la misma app corra contra PostgreSQL o contra memoria.
 *
 * @param {Object} deps
 * @param {Object} deps.movieModel - Modelo que implementa el CRUD de películas.
 * @param {Object} deps.userModel - Modelo que implementa la persistencia de usuarios.
 * @returns {import("express").Express}
 */
export const createApp = ({ movieModel, userModel }) => {
  const app = express();

  // Confiamos en el proxy para que el rate limiting y las IPs de cliente
  // funcionen bien detrás de Render o Vercel.
  app.set("trust proxy", 1);

  // Documentación (Swagger UI). Va antes del helmet global y del rate limiter
  // para que la CSP por defecto no bloquee los assets inline de la UI y para que
  // abrir la documentación no consuma el presupuesto de peticiones del cliente.
  app.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(openapiSpec, { customSiteTitle: "Movies API Docs" }),
  );

  // Cliente de demo. Se sirve desde la propia API para que el despliegue tenga
  // una sola URL. Va antes del helmet global por el mismo motivo que /docs: la
  // página lleva <style> y <script> en línea que la CSP por defecto bloquearía.
  app.use(express.static(fileURLToPath(new URL("../web", import.meta.url))));

  // Cabeceras de seguridad.
  app.use(helmet());

  // Lista blanca de CORS (los orígenes vienen de la configuración).
  app.use(middlewareCors);

  // Parsea los cuerpos JSON entrantes hacia req.body.
  app.use(express.json());

  // No anunciamos que corremos sobre Express.
  app.disable("x-powered-by");

  // Limita las peticiones por IP.
  app.use(apiRateLimiter);

  // Health check: lo usan la plataforma de despliegue y las sondas de uptime.
  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Autenticación (registro/login). Rutas públicas que emiten JWTs.
  app.use("/auth", createAuthRouter({ userModel }));

  // Recurso de películas. El modelo se inyecta por la cadena router → controlador.
  app.use("/movies", createMovieRouter({ movieModel }));

  // Rutas desconocidas → 404 con el formato de error consistente.
  app.use(notFoundHandler);

  // Manejador de errores central (tiene que ir el último).
  app.use(errorHandler);

  return app;
};
