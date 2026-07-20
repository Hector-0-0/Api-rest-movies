// tests/helpers/setup.mjs
// Andamiaje común de los tests: monta la app contra los modelos en memoria para
// que corran rápido y aislados, sin base de datos. Cada archivo de test resetea
// los almacenes en un beforeEach y usa estos helpers para obtener tokens.
import bcrypt from "bcryptjs";
import { createApp } from "../../src/app.mjs";
import { MovieModel } from "../../src/models/local-file-system/movie.mjs";
import { UserModel } from "../../src/models/local-file-system/user.mjs";

export const app = createApp({ movieModel: MovieModel, userModel: UserModel });

export { MovieModel, UserModel };

/** Devuelve ambos almacenes en memoria a un estado limpio y conocido. */
export const resetStores = () => {
  MovieModel.reset();
  UserModel.reset();
};

/** Payload válido de película; cada test sobreescribe los campos que necesite. */
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
 * Inserta un usuario con el rol indicado directamente en el almacén y devuelve
 * sus credenciales, para que el test pueda luego loguearse por /auth/login real.
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
