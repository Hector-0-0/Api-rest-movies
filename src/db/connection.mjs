// src/db/connection.mjs
// Single shared MySQL connection pool. A pool (instead of a single
// connection) survives idle disconnects and handles concurrent requests,
// which matters on hosted databases like Aiven.

import mysql from "mysql2/promise";
import { config } from "../config/index.mjs";

const { host, user, password, database, port, ssl } = config.db;

export const pool = mysql.createPool({
  host,
  user,
  password,
  database,
  port,
  waitForConnections: true,
  connectionLimit: 10,
  // Managed providers require TLS; { rejectUnauthorized: false } is enough
  // for the public certificates Aiven serves on the default endpoint.
  ...(ssl ? { ssl: { rejectUnauthorized: false } } : {}),
});
