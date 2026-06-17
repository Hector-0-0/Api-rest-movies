// tests/auth.test.mjs
// Covers registration, login and the JWT-based protection of write routes.
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app, resetStores, seedUser, validMovie } from "./helpers/setup.mjs";

beforeEach(() => resetStores());

describe("POST /auth/register", () => {
  it("creates a user and returns a token", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "new@test.com", password: "password123" });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toMatchObject({ email: "new@test.com", role: "user" });
    expect(res.body.user.password_hash).toBeUndefined();
  });

  it("rejects a duplicate email with 409", async () => {
    await seedUser({ email: "dupe@test.com" });
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "dupe@test.com", password: "password123" });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe("CONFLICT");
  });

  it("rejects a short password with 422", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "weak@test.com", password: "123" });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("rejects an invalid email with 422", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "not-an-email", password: "password123" });

    expect(res.status).toBe(422);
  });
});

describe("POST /auth/login", () => {
  it("returns a token for valid credentials", async () => {
    await seedUser({ email: "log@test.com", password: "password123" });
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "log@test.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it("rejects a wrong password with 401", async () => {
    await seedUser({ email: "log@test.com", password: "password123" });
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "log@test.com", password: "wrongpass" });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHORIZED");
  });

  it("rejects an unknown email with 401", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "ghost@test.com", password: "password123" });

    expect(res.status).toBe(401);
  });
});

describe("route protection", () => {
  const login = async (creds) =>
    (await request(app).post("/auth/login").send(creds)).body.token;

  it("blocks writes without a token (401)", async () => {
    const res = await request(app).post("/movies").send(validMovie());
    expect(res.status).toBe(401);
  });

  it("blocks writes with an invalid token (401)", async () => {
    const res = await request(app)
      .post("/movies")
      .set("Authorization", "Bearer not-a-real-token")
      .send(validMovie());
    expect(res.status).toBe(401);
  });

  it("forbids a non-admin user from writing (403)", async () => {
    const creds = await seedUser({ email: "user@test.com", role: "user" });
    const token = await login(creds);
    const res = await request(app)
      .post("/movies")
      .set("Authorization", `Bearer ${token}`)
      .send(validMovie());
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("FORBIDDEN");
  });

  it("allows an admin to write (201)", async () => {
    const creds = await seedUser({ email: "admin@test.com", role: "admin" });
    const token = await login(creds);
    const res = await request(app)
      .post("/movies")
      .set("Authorization", `Bearer ${token}`)
      .send(validMovie());
    expect(res.status).toBe(201);
  });
});
