// src/db/connection.mjs
// Pool de conexiones a PostgreSQL, compartido por toda la app. Un pool (en vez
// de una conexión suelta) sobrevive a las desconexiones por inactividad y
// atiende peticiones concurrentes, algo necesario en bases serverless como Neon.

import pg from "pg";
import { config } from "../config/index.mjs";

const { Pool } = pg;

// Los proveedores gestionados (Neon, Render) entregan una única cadena de
// conexión. En local caemos a las variables DB_* sueltas.
const poolConfig = config.db.url
  ? { connectionString: config.db.url }
  : {
      host: config.db.host,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      port: config.db.port,
    };

export const pool = new Pool({
  ...poolConfig,
  max: 10,
  // Neon se apaga tras ~5 minutos inactivo; un timeout corto evita que el pool
  // conserve conexiones que el servidor ya cerró.
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  // Los proveedores gestionados exigen TLS. rejectUnauthorized: false basta
  // para los certificados públicos que sirven Neon y Render.
  ...(config.db.ssl ? { ssl: { rejectUnauthorized: false } } : {}),
});

// Sin este handler, un error del pool (por ejemplo, la base cayéndose mientras
// está inactiva) sería un evento 'error' sin capturar y tumbaría el proceso.
pool.on("error", (error) => {
  console.error("Error inesperado en el pool de PostgreSQL:", error.message);
});
