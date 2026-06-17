// src/server.mjs
// Entry point: builds the app with the MySQL model and starts listening.

import { createApp } from "./app.mjs";
import { config } from "./config/index.mjs";
import { MovieModel } from "./models/database/movie.mjs";
import { UserModel } from "./models/database/user.mjs";

const app = createApp({ movieModel: MovieModel, userModel: UserModel });

app.listen(config.port, () => {
  console.log(`Server is running on http://localhost:${config.port}`);
});
