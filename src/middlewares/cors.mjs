//cors.mjs

// CORS configurado con el paquete `cors`. Los orígenes permitidos vienen de la
// configuración (variable CORS_ORIGINS); cualquier origen *.vercel.app se acepta
// automáticamente para que los despliegues de preview funcionen sin listarlos.
import cors from "cors";
import { config } from "../config/index.mjs";

const ACCEPTED_ORIGINS = config.corsOrigins;

const isAllowed = (origin) =>
  // Las peticiones sin Origin (curl, Postman, servidor a servidor) se permiten.
  !origin ||
  ACCEPTED_ORIGINS.includes(origin) ||
  origin.endsWith(".vercel.app");

export const middlewareCors = cors({
  origin(origin, callback) {
    if (isAllowed(origin)) return callback(null, true);
    callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
});
