// tests/helpers/setup.mjs
// Shared test harness: builds the app against the in-memory models so tests
// run fast and isolated, with no MySQL required. Each test file resets the
// stores in a beforeEach and uses these helpers to obtain auth tokens.
import bcrypt from "bcryptjs";
import { createApp } from "../../src/app.mjs";
import { MovieModel } from "../../src/models/local-file-system/movie.mjs";
import { UserModel } from "../../src/models/local-file-system/user.mjs";

export const app = createApp({ movieModel: MovieModel, userModel: UserModel });

export { MovieModel, UserModel };

/** Restores both in-memory stores to a clean, known state. */
export const resetStores = () => {
  MovieModel.reset();
  UserModel.reset();
};

/** A valid movie payload; override fields per test. */
export const validMovie = (overrides = {}) => ({
  title: "Test Movie",
  year: 2020,
  director: "Test Director",
  duration: 120,
  poster: "https://example.com/poster.jpg",
  rate: 7.5,
  genre: ["Action"],
  ...overrides,
});

/**
 * Seeds a user with the given role directly in the store and returns its
 * credentials, so a test can then log in through the real /auth/login route.
 */
export const seedUser = async ({
  email = "user@test.com",
  password = "password123",
  role = "user",
} = {}) => {
  const passwordHash = await bcrypt.hash(password, 4);
  await UserModel.create({ email, passwordHash, role });
  return { email, password, role };
};
