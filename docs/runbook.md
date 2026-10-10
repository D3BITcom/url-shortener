# Runbook

## Local development

```bash
nvm use && pnpm install
cp .env.example .env
pnpm geoip:download     # optional: country stats
pnpm dev                # applies migrations, then http://localhost:3000/r
```

Admin console: http://localhost:3000/r/admin, token `ADMIN_TOKEN` from `.env`.
Turnstile: leave the keys empty, or use Cloudflare's always-pass test keys
(see `.env.example`).

## Docker (local / review)

```bash
docker compose up --build        # http://localhost:3000/r
docker compose down              # keeps data
docker compose down -v           # deletes the database volume
```

Admin token: `local-demo-admin-token` (demo only).

## Logs

JSON lines; levels 30 info, 40 warn, 50 error. Each request has a
`requestId` (also in the `X-Request-Id` response header).

```bash
L='docker compose logs web --no-log-prefix'          # prod: add -f docker-compose.prod.yml
$L | jq 'select(.level >= 50)'                       # errors
$L --since 1h | jq 'select(.status >= 500)'          # failed requests
$L | jq 'select(.msg == "Link creation blocked") | .reason' | sort | uniq -c
$L | jq 'select(.requestId == "<id from a bug report>")'
$L | jq -r 'select(.ms > 500) | "\(.ms)ms \(.method) \(.path)"'
```

Docker rotates at 3 × 10 MB per container.

## Migrations

Development: stop `pnpm dev`, run `pnpm db:migrate --name <change>`, review
the SQL, commit it. Production: applied automatically on container start.
If a migration fails on start, the container exits and the health check
fails: check `docker compose logs web`, fix forward with a new migration
(never edit an applied one).

## Backups

The database is the `app-data` volume (`/app/data/app.db` + WAL files).

```bash
# consistent copy while running (SQLite online backup)
docker compose exec -w /app/applications/web web node -e "require('better-sqlite3')('/app/data/app.db').backup('/app/data/backup.db').then(()=>console.log('ok'))"
docker compose cp web:/app/data/backup.db ./backup-$(date +%F).db
```

Restore: stop the container, copy the file over `/app/data/app.db` (remove
`app.db-wal`/`-shm`), start.

## Rollback (production)

Every release is an image tag. Re-run the **Release** workflow manually with
`version: vX.Y.Z` (Actions → Release → Run workflow), or on the VPS:

```bash
cd ~/url-shortener
APP_VERSION=vX.Y.Z docker compose -f docker-compose.prod.yml --env-file .env up -d
```

Rolling back across a migration: migrations are additive so far, so the old
image runs fine on the newer schema. Check before relying on that.

## Rotating secrets

- **ADMIN_TOKEN**: change it in the VPS `.env`, `up -d`. Existing admin
  cookies stay valid up to 12h; also rotate `COOKIE_SECRET` to end them now.
- **COOKIE_SECRET**: invalidates all cookies. Owners must reopen their secret
  lobby link once (their links are safe).
- **ANALYTICS_SALT**: resets unique-visitor continuity from that day on.

## Common problems

| Symptom                                               | Cause / fix                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------------ |
| `database is locked` on `pnpm db:migrate`             | stop `pnpm dev` first                                              |
| Types missing after a schema change                   | `pnpm db:generate` (Prisma 7 `migrate dev` doesn't generate)       |
| Countries all "Unknown"                               | no GeoIP file (`pnpm geoip:download`), or local/private IPs        |
| Every visitor has the same country/IP in prod         | `TRUST_PROXY` not set, or nginx not sending `X-Forwarded-For`      |
| "We couldn't confirm you're a human"                  | Turnstile keys wrong, or the site key's domain list lacks the host |
| Server exits with "Invalid environment configuration" | the message lists the missing/short variables                      |
| Admin login says "Too many attempts"                  | 5 tries per minute per IP; wait a minute                           |
