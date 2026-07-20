// tests/models.contract.test.mjs
// Una sola suite para los dos backends de datos. La app inyecta o bien los
// modelos en memoria o bien los de PostgreSQL, así que cualquier diferencia
// entre ellos es un bug que los tests HTTP no pueden ver (esos siempre corren
// en memoria).
//
// La mitad de PostgreSQL se salta salvo que TEST_DATABASE_URL esté definida,
// para que `npm test` siga sin necesitar base de datos. CI y `npm run test:db`
// sí la proporcionan.
import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";

import { MovieModel as MemoryMovieModel } from "../src/models/local-file-system/movie.mjs";
import { UserModel as MemoryUserModel } from "../src/models/local-file-system/user.mjs";

const DB_URL = process.env.TEST_DATABASE_URL;

/** Payload válido de película; cada test sobreescribe lo que necesite. */
const validMovie = (overrides = {}) => ({
  title: "Contract Movie",
  year: 2020,
  director: "Test Director",
  duration: 120,
  poster: "https://example.com/poster.jpg",
  rate: 7.5,
  genre: ["Action"],
  ...overrides,
});

/**
 * El contrato común. Todo backend debe cumplirlo de forma idéntica.
 * @param {string} label - Nombre del backend, usado en el título de la suite.
 * @param {Object} ctx - { getModels, reset } del backend bajo prueba.
 */
const describeContract = (label, ctx) => {
  describe(`${label} — movie model contract`, () => {
    let MovieModel;

    beforeEach(async () => {
      await ctx.reset();
      MovieModel = ctx.getModels().MovieModel;
    });

    it("seeds 15 movies", async () => {
      const { data, total } = await MovieModel.getAll({ page: 1, limit: 100 });
      expect(total).toBe(15);
      expect(data).toHaveLength(15);
    });

    it("returns genre as an array of strings", async () => {
      const { data } = await MovieModel.getAll({ page: 1, limit: 100 });
      for (const movie of data) {
        expect(Array.isArray(movie.genre)).toBe(true);
        expect(movie.genre.length).toBeGreaterThan(0);
        expect(typeof movie.genre[0]).toBe("string");
      }
    });

    it("returns rate as a number, not a string", async () => {
      const { data } = await MovieModel.getAll({ page: 1, limit: 100 });
      for (const movie of data) {
        expect(typeof movie.rate).toBe("number");
      }
    });

    it("returns year and duration as numbers", async () => {
      const { data } = await MovieModel.getAll({ page: 1, limit: 1 });
      expect(typeof data[0].year).toBe("number");
      expect(typeof data[0].duration).toBe("number");
    });

    it("paginates without overlapping between pages", async () => {
      const first = await MovieModel.getAll({ page: 1, limit: 5 });
      const second = await MovieModel.getAll({ page: 2, limit: 5 });

      expect(first.data).toHaveLength(5);
      expect(second.data).toHaveLength(5);
      expect(first.total).toBe(15);

      const firstIds = first.data.map((m) => m.id);
      const secondIds = second.data.map((m) => m.id);
      expect(firstIds.filter((id) => secondIds.includes(id))).toEqual([]);
    });

    it("filters by genre, case-insensitively, without duplicating rows", async () => {
      const { data, total } = await MovieModel.getAll({
        genre: "drama",
        page: 1,
        limit: 100,
      });

      expect(data.length).toBeGreaterThan(0);
      expect(total).toBe(data.length);
      // Ninguna película aparece dos veces aunque varias tengan varios géneros.
      expect(new Set(data.map((m) => m.id)).size).toBe(data.length);
      for (const movie of data) {
        expect(movie.genre.map((g) => g.toLowerCase())).toContain("drama");
      }
    });

    it("sorts by a whitelisted field descending", async () => {
      const { data } = await MovieModel.getAll({
        sort: "-rate",
        page: 1,
        limit: 100,
      });
      const rates = data.map((m) => m.rate);
      expect(rates).toEqual([...rates].sort((a, b) => b - a));
    });

    it("gets a movie by id with its genres", async () => {
      const movie = await MovieModel.getById(
        "5ad1a235-0d9c-410a-b32b-220d91689a08", // Inception
      );
      expect(movie).not.toBeNull();
      expect(movie.title).toBe("Inception");
      expect([...movie.genre].sort()).toEqual(["Action", "Adventure", "Sci-Fi"]);
    });

    it("returns null for an unknown id", async () => {
      expect(
        await MovieModel.getById("00000000-0000-4000-8000-000000000000"),
      ).toBeNull();
    });

    it("returns null for a malformed id instead of throwing", async () => {
      expect(await MovieModel.getById("not-a-uuid")).toBeNull();
    });

    it("creates a movie and returns it with the genres that were sent", async () => {
      const created = await MovieModel.create(
        validMovie({ title: "Created", genre: ["Comedy", "Horror"] }),
      );

      expect(created.id).toBeTruthy();
      expect(created.title).toBe("Created");
      expect(typeof created.rate).toBe("number");
      expect([...created.genre].sort()).toEqual(["Comedy", "Horror"]);
    });

    it("round-trips a created movie through getById", async () => {
      const created = await MovieModel.create(validMovie({ title: "RoundTrip" }));
      const fetched = await MovieModel.getById(created.id);

      expect(fetched.title).toBe("RoundTrip");
      expect([...fetched.genre].sort()).toEqual([...created.genre].sort());
    });

    it("defaults rate to 0 when omitted", async () => {
      const { rate, ...withoutRate } = validMovie();
      const created = await MovieModel.create(withoutRate);
      expect(created.rate).toBe(0);
    });

    it("partially updates a movie, leaving other fields alone", async () => {
      const created = await MovieModel.create(validMovie({ rate: 5 }));
      const updated = await MovieModel.update(created.id, { rate: 9 });

      expect(updated.rate).toBe(9);
      expect(updated.title).toBe(created.title);
      expect([...updated.genre].sort()).toEqual([...created.genre].sort());
    });

    it("replaces genres only when they are supplied", async () => {
      const created = await MovieModel.create(
        validMovie({ genre: ["Action", "Crime"] }),
      );

      const untouched = await MovieModel.update(created.id, { title: "New" });
      expect([...untouched.genre].sort()).toEqual(["Action", "Crime"]);

      const replaced = await MovieModel.update(created.id, {
        genre: ["Romance"],
      });
      expect(replaced.genre).toEqual(["Romance"]);
    });

    it("returns false when updating an unknown id", async () => {
      expect(
        await MovieModel.update("00000000-0000-4000-8000-000000000000", {
          rate: 9,
        }),
      ).toBe(false);
    });

    it("deletes a movie and reports one affected row", async () => {
      const created = await MovieModel.create(validMovie());
      expect(await MovieModel.delete(created.id)).toBe(1);
      expect(await MovieModel.getById(created.id)).toBeNull();
    });

    it("returns 0 when deleting an unknown id", async () => {
      expect(
        await MovieModel.delete("00000000-0000-4000-8000-000000000000"),
      ).toBe(0);
    });
  });

  describe(`${label} — user model contract`, () => {
    let UserModel;

    beforeEach(async () => {
      await ctx.reset();
      UserModel = ctx.getModels().UserModel;
    });

    it("creates a user and returns it without the password hash", async () => {
      const user = await UserModel.create({
        email: "contract@test.com",
        passwordHash: "hashed",
      });

      expect(user.id).toBeTruthy();
      expect(user.email).toBe("contract@test.com");
      expect(user.role).toBe("user");
      expect(user.password_hash).toBeUndefined();
    });

    it("finds a user by email, including the hash", async () => {
      await UserModel.create({
        email: "find@test.com",
        passwordHash: "hashed",
      });

      const found = await UserModel.findByEmail("find@test.com");
      expect(found.password_hash).toBe("hashed");
    });

    // MySQL comparaba emails sin distinguir mayúsculas por su colación;
    // PostgreSQL no. Ambos backends deben normalizar, o la misma cuenta podría
    // registrarse dos veces y el login fallaría según cómo se escribiera.
    it("matches emails case-insensitively", async () => {
      await UserModel.create({
        email: "Mixed.Case@Test.com",
        passwordHash: "hashed",
      });

      expect(await UserModel.findByEmail("mixed.case@test.com")).not.toBeNull();
      expect(await UserModel.findByEmail("MIXED.CASE@TEST.COM")).not.toBeNull();
    });

    it("stores emails lowercased", async () => {
      const user = await UserModel.create({
        email: "UPPER@Test.com",
        passwordHash: "hashed",
      });
      expect(user.email).toBe("upper@test.com");
    });

    it("honours an explicit admin role", async () => {
      const user = await UserModel.create({
        email: "admin@contract.com",
        passwordHash: "hashed",
        role: "admin",
      });
      expect(user.role).toBe("admin");
    });

    it("returns null for an unknown email", async () => {
      expect(await UserModel.findByEmail("nobody@test.com")).toBeNull();
    });
  });
};

// --- Backend en memoria ----------------------------------------------------

describeContract("in-memory", {
  getModels: () => ({
    MovieModel: MemoryMovieModel,
    UserModel: MemoryUserModel,
  }),
  reset: () => {
    MemoryMovieModel.reset();
    MemoryUserModel.reset();
  },
});

// --- Backend PostgreSQL ----------------------------------------------------

describe.skipIf(!DB_URL)("PostgreSQL", () => {
  let pool;
  let PgMovieModel;
  let PgUserModel;
  let schemaSql;

  beforeAll(async () => {
    // Apuntamos la config a la base de test antes de que se cargue el pool.
    process.env.DATABASE_URL = DB_URL;

    const fs = await import("node:fs/promises");
    schemaSql = await fs.readFile(
      new URL("../schema.sql", import.meta.url),
      "utf8",
    );

    ({ pool } = await import("../src/db/connection.mjs"));
    ({ MovieModel: PgMovieModel } = await import(
      "../src/models/database/movie.mjs"
    ));
    ({ UserModel: PgUserModel } = await import(
      "../src/models/database/user.mjs"
    ));
  });

  afterAll(async () => {
    await pool?.end();
  });

  describeContract("postgres", {
    getModels: () => ({ MovieModel: PgMovieModel, UserModel: PgUserModel }),
    // Reejecutar schema.sql restaura el estado semilla exacto entre tests.
    reset: async () => {
      await pool.query(schemaSql);
    },
  });
});
