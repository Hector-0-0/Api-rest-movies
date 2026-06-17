# Production image for the Movies REST API.
FROM node:20-alpine

# App lives here.
WORKDIR /app

# Install only production dependencies first to leverage Docker layer caching.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy the application source and the compatibility entry point.
COPY src ./src
COPY server-with-mysql.mjs ./

# Run as the unprivileged user that the base image already ships with.
USER node

ENV NODE_ENV=production
EXPOSE 3000

# Lightweight health check against the /health endpoint.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["npm", "start"]
