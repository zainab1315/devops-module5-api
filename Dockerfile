# ---------- Stage 1: install dependencies ----------
FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# ---------- Stage 2: production image ----------
FROM node:20-alpine AS production

ENV NODE_ENV=production \
    PORT=3000

# Run as a non-root user (security best practice)
WORKDIR /app

RUN apk add --no-cache curl \
    && addgroup -S appgroup \
    && adduser -S appuser -G appgroup

COPY --from=deps --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --chown=appuser:appgroup package*.json ./
COPY --chown=appuser:appgroup src ./src

USER appuser

EXPOSE 3000

# Docker HEALTHCHECK hits the endpoint the monitoring stack also uses
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://localhost:3000/health || exit 1

CMD ["node", "src/server.js"]
