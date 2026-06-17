// server-with-mysql.mjs
// Compatibility shim: the real entry point now lives in src/server.mjs.
// This file is kept so any deploy configured to run
// `node server-with-mysql.mjs` (e.g. Koyeb) keeps working.
import "./src/server.mjs";
