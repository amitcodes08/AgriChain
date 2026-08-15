# syntax=docker/dockerfile:1

# ---- deps ------------------------------------------------------------------
# Installed separately so a source-only change doesn't re-resolve the tree.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build -----------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc -p tsconfig.json

# Drop dev dependencies from the tree we are about to copy forward.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- runtime ---------------------------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

# tini reaps zombies and forwards signals, so `docker stop` is a clean shutdown.
RUN apk add --no-cache tini curl

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

# The seeder ships compiled (dist/scripts/seed.js) so the runtime image needs no
# dev dependencies: `docker compose run --rm backend node dist/scripts/seed.js`.

USER node
EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=4s --start-period=20s --retries=5 \
  CMD curl -fsS http://127.0.0.1:4000/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/server.js"]
