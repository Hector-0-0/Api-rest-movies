//cors.mjs

// CORS configurado con el paquete `cors`. Los orígenes permitidos vienen de la
// configuración (variable CORS_ORIGINS); además se aceptan siempre el propio
// origen de la API y cualquier subdominio *.vercel.app, para que los
// despliegues de preview funcionen sin tener que listarlos uno a uno.
import cors from "cors";
import { config } from "../config/index.mjs";
import { ApiError } from "../errors/api-error.mjs";

const ACCEPTED_ORIGINS = config.corsOrigins;

/**
 * La API sirve su propio cliente de demo, así que las peticiones que salen de
 * esa página llevan como Origin la URL de la propia API. Permitirlas no es una
 * decisión de lista blanca: una petición del mismo origen no es CORS en
 * absoluto, y bloquearla rompía el cliente aunque el despliegue fuese correcto.
 */
const isSameOrigin = (origin, req) => {
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    // Un Origin malformado no es del mismo origen.
    return false;
  }
};

const isAllowed = (origin, req) =>
  // Las peticiones sin Origin (curl, Postman, servidor a servidor) se permiten.
  !origin ||
  isSameOrigin(origin, req) ||
  ACCEPTED_ORIGINS.includes(origin) ||
  origin.endsWith(".vercel.app");

// La forma `cors(fn)` recibe la petición completa, que hace falta para poder
// comparar el Origin con el Host y detectar el mismo origen.
export const middlewareCors = cors((req, callback) => {
  const origin = req.headers.origin;

  if (isAllowed(origin, req)) {
    return callback(null, {
      origin: true,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    });
  }

  // Un origen no permitido es un error del cliente, no del servidor. Antes se
  // lanzaba un Error genérico que el manejador central convertía en un 500
  // "Something went wrong", que no decía nada sobre la causa real.
  callback(ApiError.forbidden(`Origen no permitido por CORS: ${origin}`));
});
