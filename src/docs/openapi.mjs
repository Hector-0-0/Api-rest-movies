// docs/openapi.mjs
// Especificación OpenAPI 3.0 escrita a mano que describe la API pública. Es un
// objeto JS plano (sin paso de build) que swagger-ui-express sirve en /docs.
import { GENRES, SORTABLE_FIELDS } from "../schemas/movies.mjs";

const errorSchema = {
  type: "object",
  properties: {
    status: { type: "integer", example: 404 },
    code: { type: "string", example: "NOT_FOUND" },
    message: { type: "string", example: "Movie not found" },
    details: { type: "array", items: { type: "object" } },
  },
};

const movieSchema = {
  type: "object",
  required: ["title", "year", "director", "duration", "poster", "genre"],
  properties: {
    id: { type: "string", format: "uuid", readOnly: true },
    title: { type: "string", example: "Inception" },
    year: { type: "integer", example: 2010 },
    director: { type: "string", example: "Christopher Nolan" },
    duration: { type: "integer", description: "Minutes", example: 148 },
    poster: { type: "string", format: "uri", example: "https://example.com/p.jpg" },
    rate: { type: "number", minimum: 0, maximum: 10, example: 8.8 },
    genre: {
      type: "array",
      items: { type: "string", enum: GENRES },
      example: ["Action", "Sci-Fi"],
    },
  },
};

export const openapiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Movies REST API",
    version: "1.0.0",
    description:
      "REST API for movies (Node.js + Express + PostgreSQL). Reads are public; " +
      "creating, updating and deleting movies requires an admin JWT.",
  },
  servers: [{ url: "/", description: "Current host" }],
  tags: [
    { name: "Auth", description: "Registration and login" },
    { name: "Movies", description: "Movie catalogue" },
    { name: "System", description: "Health checks" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      Movie: movieSchema,
      Error: errorSchema,
      AuthRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "admin@example.com" },
          password: { type: "string", minLength: 8, example: "admin12345" },
        },
      },
      AuthResponse: {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              email: { type: "string", format: "email" },
              role: { type: "string", enum: ["user", "admin"] },
            },
          },
          token: { type: "string", description: "JWT bearer token" },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: "Missing or invalid token",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
      },
      Forbidden: {
        description: "Authenticated but not allowed (non-admin)",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
      },
      NotFound: {
        description: "Resource not found",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
      },
      ValidationError: {
        description: "Invalid request data",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["System"],
        summary: "Health check",
        responses: {
          200: {
            description: "Service is up",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { status: { type: "string", example: "ok" } },
                },
              },
            },
          },
        },
      },
    },
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user (role: user)",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/AuthRequest" } } },
        },
        responses: {
          201: {
            description: "User created",
            content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } } },
          },
          409: {
            description: "Email already registered",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
          422: { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Log in and receive a JWT",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/AuthRequest" } } },
        },
        responses: {
          200: {
            description: "Authenticated",
            content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } } },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          422: { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/movies": {
      get: {
        tags: ["Movies"],
        summary: "List movies (paginated, filterable, sortable)",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10, minimum: 1, maximum: 100 } },
          { name: "genre", in: "query", schema: { type: "string", enum: GENRES } },
          {
            name: "sort",
            in: "query",
            description: `Field to sort by; prefix with "-" for descending. One of: ${SORTABLE_FIELDS.join(", ")}.`,
            schema: { type: "string", example: "-rate" },
          },
        ],
        responses: {
          200: {
            description:
              "Array of movies. Pagination metadata is returned in the " +
              "X-Total-Count, X-Total-Pages, X-Page and X-Limit headers.",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Movie" } },
              },
            },
          },
          422: { $ref: "#/components/responses/ValidationError" },
        },
      },
      post: {
        tags: ["Movies"],
        summary: "Create a movie (admin only)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/Movie" } } },
        },
        responses: {
          201: {
            description: "Movie created",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Movie" } } },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          422: { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/movies/{id}": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      get: {
        tags: ["Movies"],
        summary: "Get a movie by id",
        responses: {
          200: {
            description: "The movie",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Movie" } } },
          },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
      patch: {
        tags: ["Movies"],
        summary: "Partially update a movie (admin only)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/Movie" } } },
        },
        responses: {
          200: {
            description: "Updated movie",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Movie" } } },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
          422: { $ref: "#/components/responses/ValidationError" },
        },
      },
      delete: {
        tags: ["Movies"],
        summary: "Delete a movie (admin only)",
        security: [{ bearerAuth: [] }],
        responses: {
          204: { description: "Movie deleted" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
  },
};
