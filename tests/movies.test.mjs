// tests/movies.test.mjs
// Cubre el CRUD de películas, la validación de entrada, paginación/filtro/orden
// y el formato de error consistente. Las lecturas son públicas; las escrituras
// usan un token de admin.
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app, resetStores, seedUser, validMovie } from "./helpers/setup.mjs";

beforeEach(() => resetStores());

/** Loguea un admin recién sembrado y devuelve su token Bearer. */
const adminToken = async () => {
  const creds = await seedUser({ email: "admin@test.com", role: "admin" });
  const res = await request(app).post("/auth/login").send(creds);
  return res.body.token;
};

const authPost = async (payload) =>
  request(app)
    .post("/movies")
    .set("Authorization", `Bearer ${await adminToken()}`)
    .send(payload);

describe("GET /movies", () => {
  it("returns a paginated list with pagination headers", async () => {
    const res = await request(app).get("/movies?page=1&limit=5");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(5);
    expect(res.headers["x-total-count"]).toBe("15");
    expect(res.headers["x-page"]).toBe("1");
    expect(res.headers["x-limit"]).toBe("5");
  });

  it("filters by genre", async () => {
    const res = await request(app).get("/movies?genre=Romance");
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    for (const movie of res.body) {
      expect(movie.genre).toContain("Romance");
    }
  });

  it("sorts by a whitelisted field descending", async () => {
    const res = await request(app).get("/movies?sort=-rate&limit=100");
    const rates = res.body.map((m) => m.rate);
    const sorted = [...rates].sort((a, b) => b - a);
    expect(rates).toEqual(sorted);
  });

  it("rejects an invalid sort field with 422", async () => {
    const res = await request(app).get("/movies?sort=hacker");
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a non-positive limit with 422", async () => {
    const res = await request(app).get("/movies?limit=0");
    expect(res.status).toBe(422);
  });
});

describe("GET /movies/:id", () => {
  it("returns a single movie", async () => {
    const id = "5ad1a235-0d9c-410a-b32b-220d91689a08"; // Inception
    const res = await request(app).get(`/movies/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Inception");
  });

  it("returns 404 for an unknown id in the error shape", async () => {
    const res = await request(app).get("/movies/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({
      status: 404,
      code: "NOT_FOUND",
      message: expect.any(String),
    });
  });
});

describe("POST /movies", () => {
  it("creates a movie as admin (201)", async () => {
    const res = await authPost(validMovie({ title: "Brand New" }));
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ title: "Brand New" });
    expect(res.body.id).toBeTruthy();
  });

  it("rejects a missing required field with 422", async () => {
    const { title, ...withoutTitle } = validMovie();
    const res = await authPost(withoutTitle);
    expect(res.status).toBe(422);
    expect(res.body.details).toBeInstanceOf(Array);
  });

  it("rejects an invalid genre with 422", async () => {
    const res = await authPost(validMovie({ genre: ["NotAGenre"] }));
    expect(res.status).toBe(422);
  });

  it("rejects a non-URL poster with 422", async () => {
    const res = await authPost(validMovie({ poster: "not-a-url" }));
    expect(res.status).toBe(422);
  });
});

describe("PATCH /movies/:id", () => {
  it("partially updates a movie as admin", async () => {
    const created = await authPost(validMovie({ rate: 5 }));
    const id = created.body.id;

    const res = await request(app)
      .patch(`/movies/${id}`)
      .set("Authorization", `Bearer ${await adminToken()}`)
      .send({ rate: 9 });

    expect(res.status).toBe(200);
    expect(res.body.rate).toBe(9);
    expect(res.body.title).toBe(created.body.title); // unchanged
  });

  it("returns 404 when updating an unknown id", async () => {
    const res = await request(app)
      .patch("/movies/unknown")
      .set("Authorization", `Bearer ${await adminToken()}`)
      .send({ rate: 9 });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /movies/:id", () => {
  it("deletes a movie as admin (204)", async () => {
    const created = await authPost(validMovie());
    const id = created.body.id;
    const token = await adminToken();

    const res = await request(app)
      .delete(`/movies/${id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(204);

    const after = await request(app).get(`/movies/${id}`);
    expect(after.status).toBe(404);
  });

  it("returns 404 when deleting an unknown id", async () => {
    const res = await request(app)
      .delete("/movies/unknown")
      .set("Authorization", `Bearer ${await adminToken()}`);
    expect(res.status).toBe(404);
  });
});

describe("unknown routes", () => {
  it("returns 404 in the consistent error shape", async () => {
    const res = await request(app).get("/not-a-route");
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ status: 404, code: "NOT_FOUND" });
  });
});
