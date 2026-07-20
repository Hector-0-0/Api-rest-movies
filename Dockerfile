# Imagen de producción de la Movies REST API.
FROM node:20-alpine

# Aquí vive la app.
WORKDIR /app

# Instalamos solo dependencias de producción primero, para aprovechar la caché de capas.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copiamos el código, el cliente de demo y el esquema (útil para sembrar
# una base nueva).
COPY src ./src
COPY web ./web
COPY schema.sql ./

# Corremos con el usuario sin privilegios que ya trae la imagen base.
USER node

ENV NODE_ENV=production
EXPOSE 3000

# Health check ligero contra el endpoint /health.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["npm", "start"]
