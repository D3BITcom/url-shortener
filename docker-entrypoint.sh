#!/bin/sh
# Apply pending migrations before serving traffic. `migrate deploy` only runs
# committed migrations and never resets data, so it's safe on every start.
set -eu

(cd /app/libs/database && ./node_modules/.bin/prisma migrate deploy)

cd /app/applications/web
exec node server.js
