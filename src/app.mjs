// src/app.mjs
// Builds and configures the Express application. It does NOT start the
// server: keeping app definition separate from `listen()` lets tests
// import the app and run it with Supertest without opening a port.

import express from "express";
import helmet from "helmet";
import { createMovieRouter } from "./routes/movies.mjs";
import { middlewareCors } from "./middlewares/cors.mjs";
import { apiRateLimiter } from "./middlewares/rate-limit.mjs";
import { notFoundHandler, errorHandler } from "./middlewares/error-handler.mjs";

/**
 * createApp: factory that wires middlewares and routes around an injected
 * data model, so the same app can run against MySQL or an in-memory model.
 *
 * @param {Object} deps
 * @param {Object} deps.movieModel - Data model implementing the movie CRUD.
 * @returns {import("express").Express}
 */
export const createApp = ({ movieModel }) => {
  const app = express();

  // Trust the proxy so rate limiting and client IPs work behind Koyeb/Vercel.
  app.set("trust proxy", 1);

  // Security headers.
  app.use(helmet());

  // CORS whitelist (origins come from configuration).
  app.use(middlewareCors);

  // Parse incoming JSON bodies into req.body.
  app.use(express.json());

  // Don't advertise that we run on Express.
  app.disable("x-powered-by");

  // Throttle requests per IP.
  app.use(apiRateLimiter);

  // Health check — handy for the deploy platform and uptime probes.
  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Movies resource. The model is injected down the router → controller chain.
  app.use("/movies", createMovieRouter({ movieModel }));

  // Unknown routes → 404 in the consistent error shape.
  app.use(notFoundHandler);

  // Central error handler (must be last).
  app.use(errorHandler);

  return app;
};
