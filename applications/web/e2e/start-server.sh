#!/bin/sh
# Starts the production build on :3100 against a throwaway SQLite database,
# for Playwright. Explicit env vars win over the repo-root .env that server.js
# loads (process.loadEnvFile never overrides variables that are already set).
set -eu

cd "$(dirname "$0")/.."
tmp=$(mktemp -d)
export DATABASE_URL="file:$tmp/e2e.db"

(cd ../../libs/database && ./node_modules/.bin/prisma migrate deploy >/dev/null)

export PORT=3100 \
  PUBLIC_URL=http://localhost:3100 \
  ANALYTICS_SALT=e2e-analytics-salt-0123456789 \
  COOKIE_SECRET=e2e-cookie-secret-0123456789 \
  ADMIN_TOKEN=e2e-admin-token-0123456789 \
  RATE_LIMIT_MAX=1000 \
  TURNSTILE_SITE_KEY= \
  TURNSTILE_SECRET_KEY= \
  TRUST_PROXY=false \
  LOG_LEVEL=warn

exec node server.js
