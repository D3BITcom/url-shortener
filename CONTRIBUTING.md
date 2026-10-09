# Contributing

## Setup

```bash
nvm use                # Node 22 (.nvmrc)
pnpm install
cp .env.example .env   # then set ANALYTICS_SALT=$(openssl rand -hex 32)
pnpm db:deploy         # create data/app.db from the migrations
pnpm geoip:download    # optional: country lookups
pnpm dev               # http://localhost:3000
```

| Command                           | What it does                                             |
| --------------------------------- | -------------------------------------------------------- |
| `pnpm dev`                        | Dev server with HMR                                      |
| `pnpm test`                       | All test suites (Vitest)                                 |
| `pnpm typecheck`                  | TypeScript across all packages                           |
| `pnpm format`                     | Prettier (CI runs `format:check`)                        |
| `pnpm build`                      | Production build                                         |
| `pnpm db:migrate --name <change>` | Create and apply a migration after editing the schema    |
| `pnpm db:deploy`                  | Apply pending migrations (what production runs on start) |
| `pnpm db:studio`                  | Browse the database                                      |

## Architecture (MVC on top of React Router)

```
libs/engine/         MODEL: domain entities, services, repository interfaces.
                     Pure TypeScript: no framework, no database.
libs/database/       PERSISTENCE: Prisma schema, migrations, repository implementations.
                     The only package that imports Prisma.
applications/web/
  app/routes/        CONTROLLERS (loader/action) + their page VIEW (default export)
  app/components/    VIEWS: ui/ = generic primitives (shadcn style), others = feature components
  app/.server/       Composition root (container.ts), config, server-only adapters
  server/, server.js Express entry (needed for the real client IP)
```

Dependencies point inwards: `web → database → engine`. The engine never imports
from the other two.

### Rules of thumb

- **Controllers stay thin.** A loader/action parses input, calls one service and
  maps the result to a view model. If you're writing an `if` about business
  rules in a route, it belongs in a service in `libs/engine`.
- **Expected failures are `DomainError`s**, with messages written for end
  users. Controllers show them as-is; anything else is logged and becomes a
  generic error.
- **Add an interface only when there are two implementations** (e.g. Prisma
  vs. test double, real GeoIP vs. none). No DI container: constructors take
  dependencies, `container.ts` wires them.
- **Server-only code goes in `.server/`** (or the libs), so it can never end
  up in the browser bundle.
- **Tests:** engine logic gets unit tests with test doubles; repositories get
  integration tests against a real, migrated SQLite file.

## Database changes

1. Edit `libs/database/prisma/schema.prisma`.
2. `pnpm db:migrate --name add_link_expiry`. This creates
   `prisma/migrations/<timestamp>_add_link_expiry/migration.sql`, applies it
   locally and regenerates the client.
3. Review the SQL and commit it with the schema change. Never edit a
   migration that has been merged; add a new one.
4. Production applies it automatically on the next deploy (`prisma migrate deploy`).

### Switching from SQLite to another database

The schema avoids SQLite-specific features, so for Postgres:

1. `schema.prisma`: `provider = "postgresql"`.
2. `libs/database/src/client.ts`: replace the better-sqlite3 adapter with
   `@prisma/adapter-pg` (and drop the WAL pragma).
3. Migration SQL is database-specific: move `prisma/migrations` aside and run
   `pnpm db:migrate --name init` for a new baseline.
4. Set `DATABASE_URL` to the Postgres connection string.

No engine or web code changes.

## Dependencies

`pnpm-workspace.yaml` sets `minimumReleaseAge` to 14 days: pnpm won't resolve
versions published more recently than that. This protects against
compromised or broken fresh releases. Prisma packages are pinned to the same
exact version; upgrade them together.
