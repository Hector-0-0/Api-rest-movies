//cors.mjs

import { config } from "../config/index.mjs";

/**
 * Lista blanca (whitelist) de dominios permitidos, cargada desde la
 * configuración (CORS_ORIGINS en el .env). Cualquier subdominio de
 * *.vercel.app se acepta para no tener que listar cada preview deploy.
 */
const ACCEPTED_ORIGINS = config.corsOrigins;

/**
 * middlewareCors: Actúa como el filtro de seguridad para las peticiones cruzadas.
 */
export const middlewareCors = (req, res, next) => {
  // Obtenemos el origen (quién hace la petición).
  // Nota: Si la petición es del mismo servidor o una herramienta como Postman, origin será undefined.
  const origin = req.headers.origin;

  // Verificamos si el origen está en nuestra lista blanca.
  // También podríamos añadir 'if (!origin)' para permitir peticiones locales/herramientas de testing.
  if (ACCEPTED_ORIGINS.includes(origin) || (origin && origin.endsWith(".vercel.app"))) {
    // 1. Especificamos qué origen tiene permiso para leer la respuesta.
    // Usamos el origen dinámico en lugar de "*" para mayor seguridad.
    res.setHeader("Access-Control-Allow-Origin", origin ?? "*");

    // 2. Definimos los métodos permitidos.
    // Es vital incluir OPTIONS para que el navegador pueda hacer el "preflight check".
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PATCH, OPTIONS, DELETE",
    );

    // 3. Indicamos qué cabeceras personalizadas puede enviar el cliente.
    // Sin "Content-Type", el cliente no podría enviarte JSON en el body.
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  // IMPORTANTE: next() permite que la petición siga su camino hacia los Routers.
  next();
};
