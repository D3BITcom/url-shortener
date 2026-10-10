# Contributing

Start with [AGENTS.md](./AGENTS.md) (how we work: plan first, layering,
tests, privacy) and [docs/architecture.md](./docs/architecture.md).

## Setup

```bash
nvm use                # Node 22 (.nvmrc)
pnpm install
cp .env.example .env
pnpm geoip:download    # optional: country lookups
pnpm dev               # applies migrations, then http://localhost:3000/r
```

| Command                           | What it does                                             |
| --------------------------------- | -------------------------------------------------------- |
| `pnpm dev`                        | Apply migrations, then dev server with HMR               |
| `pnpm test`                       | Unit + integration suites (Vitest)                       |
| `pnpm test:e2e`                   | Browser flows (Playwright)                               |
| `pnpm typecheck`                  | TypeScript across all packages                           |
| `pnpm format`                     | Prettier (CI runs `format:check`)                        |
| `pnpm build`                      | Production build                                         |
| `pnpm db:migrate --name <change>` | Create and apply a migration after editing the schema    |
| `pnpm db:generate`                | Regenerate the Prisma client                             |
| `pnpm db:deploy`                  | Apply pending migrations (what production runs on start) |
| `pnpm db:studio`                  | Browse the database                                      |

## Environment

All variables are documented in [.env.example](./.env.example). The ones
you'll touch most:

| Variable                                      | Purpose                                          |
| --------------------------------------------- | ------------------------------------------------ |
| `PUBLIC_URL`                                  | Origin for short links (`<PUBLIC_URL>/r/<code>`) |
| `COOKIE_SECRET`                               | Signs owner/admin cookies                        |
| `ADMIN_TOKEN`                                 | Enables `/r/admin`; unset = admin area disabled  |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Optional human check on link creation            |
| `LOG_LEVEL`                                   | `debug` / `info` / `warn` / `error`              |
| `TRUST_PROXY`                                 | `true` only behind nginx                         |

## Architecture (MVC on top of React Router)

```
libs/engine/         MODEL: domain entities, services, permissions, repository interfaces.
                     Pure TypeScript: no framework, no database.
libs/database/       PERSISTENCE: Prisma schema, migrations, repository implementations.
                     The only package that imports Prisma.
applications/web/
  app/routes/        CONTROLLERS (loader/action) + their page VIEW (default export)
  app/components/    VIEWS: ui/ = old-school design system, others = feature components
  app/.server/       Composition root (container.ts), config, session, logger, adapters
  server/, server.js Express entry (needed for the real client IP)
```

Dependencies point inwards: `web → database → engine`. The engine never
imports from the other two. Routes live under `/r` (`/r`, `/r/me`,
`/r/stats/:code`, `/r/top`, `/r/admin`, `/r/:code`).

### Rules of thumb

- **Controllers stay thin.** Parse input, `getViewer()`, call one service,
  map the result to a view model. Business rules belong in `libs/engine`.
- **Permissions are engine rules** (`access.ts`, `ShortUrlService`), tested
  there, including the "a stranger can't" cases.
- **Expected failures are `DomainError`s**, with messages written for end
  users. Anything else is logged and becomes a generic error.
- **Add an interface only when there are two implementations.** No DI
  container: constructors take dependencies, `container.ts` wires them.
- **Server-only code goes in `.server/`** (or the libs).
- **UI uses the design tokens** in `app/app.css` and the primitives in
  `components/ui`.

## Database changes

1. Edit `libs/database/prisma/schema.prisma`.
2. **Stop `pnpm dev`** (SQLite locks the file during migrations).
3. `pnpm db:migrate --name add_link_expiry`, then review the generated SQL.
   New required columns need a backfill written into the migration.
4. `pnpm db:generate` if your editor shows stale types (Prisma 7's
   `migrate dev` doesn't regenerate the client; Turbo does before
   dev/test/typecheck).
5. Commit the migration with the schema. Never edit a merged migration.
6. Production applies it on the next deploy (`prisma migrate deploy`).

### Switching from SQLite to another database

1. `schema.prisma`: `provider = "postgresql"`.
2. `libs/database/src/client.ts`: replace the better-sqlite3 adapter with
   `@prisma/adapter-pg` (and drop the WAL pragma).
3. Migration SQL is database-specific: move `prisma/migrations` aside and run
   `pnpm db:migrate --name init` for a new baseline.
4. Set `DATABASE_URL` to the Postgres connection string.

No engine or web code changes.

## Branches, commits, releases

- Work on `feature/*` branches, PR into `dev` (squash; the PR title must be a
  conventional commit, e.g. `feat: link expiry`).
- PR `dev → main` (merge commit). Each merge to `main` runs CI, computes the
  next version from commit types (`fix` → patch, `feat` → minor, `!` →
  major), publishes a GitHub Release and Docker image, and deploys. See
  [deploy/README.md](./deploy/README.md).

## Dependencies

`pnpm-workspace.yaml` sets `minimumReleaseAge` to 14 days: pnpm won't resolve
versions published more recently than that. Prisma packages are pinned to
the same exact version; upgrade them together. Ask before adding a
dependency (see AGENTS.md).
