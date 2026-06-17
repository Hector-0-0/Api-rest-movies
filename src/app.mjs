// src/app.mjs
// Builds and configures the Express application. It does NOT start the
// server: keeping app definition separate from `listen()` lets tests
// import the app and run it with Supertest without opening a port.

import express from "express";
import { createMovieRouter } from "./routes/movies.mjs";
import { middlewareCors } from "./middlewares/cors.mjs";

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

  // Parse incoming JSON bodies into req.body.
  app.use(express.json());

  // Don't advertise that we run on Express.
  app.disable("x-powered-by");

  // CORS whitelist (origins come from configuration).
  app.use(middlewareCors);

  // Health check — handy for the deploy platform and uptime probes.
  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Movies resource. The model is injected down the router → controller chain.
  app.use("/movies", createMovieRouter({ movieModel }));

  return app;
};
