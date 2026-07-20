// src/server.mjs
// Punto de entrada: monta la app con los modelos de PostgreSQL y se pone a escuchar.

import { createApp } from "./app.mjs";
import { config } from "./config/index.mjs";
import { MovieModel } from "./models/database/movie.mjs";
import { UserModel } from "./models/database/user.mjs";

const app = createApp({ movieModel: MovieModel, userModel: UserModel });

app.listen(config.port, () => {
  console.log(`Server is running on http://localhost:${config.port}`);
});
