# Node 22 LTS (Node 20 reached end-of-life in April 2026).
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate
WORKDIR /app

# --- Dependencies: only manifests, so this layer is cached until they change
FROM base AS dependencies
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY libs/engine/package.json ./libs/engine/
COPY libs/database/package.json ./libs/database/
COPY applications/web/package.json ./applications/web/
RUN pnpm install --frozen-lockfile

# --- Build: generate the Prisma client, then bundle the app
FROM dependencies AS build
COPY . .
RUN pnpm build

# --- GeoIP: monthly DB-IP Lite database, baked into the image. Optional: if
# the download fails, the app still runs and countries show as "Unknown".
FROM base AS geoip
RUN apk add --no-cache curl
COPY scripts/download-geoip.sh ./
RUN mkdir -p /geoip && (sh download-geoip.sh /geoip/dbip-country-lite.mmdb || true)

# --- Runtime
FROM base AS production
ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_URL=file:/app/data/app.db \
    GEOIP_DB_PATH=/app/geoip/dbip-country-lite.mmdb

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/libs ./libs
COPY --from=build /app/applications/web/node_modules ./applications/web/node_modules
COPY --from=build /app/applications/web/build ./applications/web/build
COPY --from=build /app/applications/web/server.js /app/applications/web/package.json ./applications/web/
COPY --from=build /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=geoip /geoip ./geoip
COPY docker-entrypoint.sh ./

# SQLite lives on a volume so data survives container restarts and rebuilds.
RUN mkdir -p /app/data && chown node:node /app/data
VOLUME /app/data
USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD wget -qO- "http://127.0.0.1:${PORT}/healthz" || exit 1

ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
