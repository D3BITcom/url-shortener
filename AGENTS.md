# Working on this repo (for agents and humans)

d3b.it/r: a URL shortener with privacy-friendly click analytics. pnpm + Turbo
monorepo, React Router v7 (SSR) on a custom Express server, Prisma 7 + SQLite.
Background: [docs/architecture.md](./docs/architecture.md),
[docs/decisions.md](./docs/decisions.md), [docs/runbook.md](./docs/runbook.md).

These are working agreements, not a cage. If a rule gets in the way of
doing the right thing, say so and explain why.

## How we work

- **Plan first.** Before multi-file changes, new features or anything
  user-visible, write a short plan (what, why, which files) and get approval.
  Small, obvious fixes don't need a plan.
- **Ask before deciding for the owner.** Product behavior (who sees what,
  limits, defaults, copy), new dependencies, renaming routes, and anything
  outward-facing (pushing, creating repos, deploying) need a yes first.
  _Lesson from the first session:_ a whole refactor shipped, including
  dependency and product choices, before the owner had agreed to a plan. It
  worked, but they wanted to be part of those calls. When in doubt, ask.
- **Present options with a recommendation**, not an open-ended survey.
- **Verify by running, then report honestly.** Tests, typecheck, and the real
  app (curl, a browser, `docker compose up`). If something failed or was
  skipped, say so. "Should work" is not done.
- **Don't over-engineer.** No DI container, no speculative abstractions. Add
  an interface only when there are two real implementations (Prisma vs. test
  double, Turnstile vs. disabled, GeoIP vs. none).

## Architecture rules

```
libs/engine     MODEL: domain types, services, rules, repository interfaces.
                Pure TypeScript. Imports no framework, no Prisma, no HTTP.
libs/database   PERSISTENCE: Prisma schema, migrations, repository classes.
                The only package that imports Prisma.
applications/web
  app/routes/      CONTROLLERS (loader/action) + the page VIEW (default export)
  app/components/  VIEWS: ui/ = design-system primitives, others = features
  app/.server/     server-only: container.ts (composition root), config,
                   session (cookies -> Viewer), logger, adapters
  server/, server.js  Express entry (needed for the real client IP)
```

- Dependencies point inward: `web -> database -> engine`.
- **Controllers stay thin:** parse input, `getViewer()`, call one service, map
  to a view model. A business rule in a route belongs in the engine.
- **Permissions live in the engine** (`short-url/access.ts`,
  `ShortUrlService`). Routes never decide who may see or change a link.
- **Expected failures are `DomainError`s** with messages written for users.
  Everything else gets logged (`toUserMessage`) and shown as a generic error.
- `container.ts` is the only place concrete classes are constructed.
- Server-only code goes in `.server/` (or the libs), so it never reaches
  the browser bundle.
- UI: reuse `components/ui` and the tokens in `app.css` (the old-school
  design system). New colors or one-off styles go into tokens first.

## Tests

| Kind        | Where                  | What it covers                                                           |
| ----------- | ---------------------- | ------------------------------------------------------------------------ |
| Unit        | `libs/engine/test`     | business rules, **permissions**, slugs, URL policy, analytics enrichment |
| Integration | `libs/database/test`   | repositories against a real SQLite file built from the migrations        |
| End-to-end  | `applications/web/e2e` | user flows in a browser (create, lobby, privacy, admin)                  |

New rules need unit tests; new queries need integration tests; anything
touching "who can see what" needs a test that proves a stranger **can't**.

Commands: `pnpm test`, `pnpm test:e2e`, `pnpm typecheck`, `pnpm format:check`.

## Database & migrations

1. Edit `libs/database/prisma/schema.prisma`.
2. **Stop `pnpm dev` first.** SQLite locks the file and `migrate dev` fails
   with "database is locked".
3. `pnpm db:migrate --name <change>`, then review the generated SQL.
4. Prisma 7's `migrate dev` **does not regenerate the client**. Turbo's
   `generate` task does it before dev/test/typecheck, or run
   `pnpm db:generate`.
5. New required columns on existing tables need a hand-written backfill in
   the migration (see the `codeKey = lower(code)` example in
   `20261009131110_owners_slugs_visibility`).
6. Never edit a migration that has been merged; add a new one. Production
   applies migrations on container start (`prisma migrate deploy`).

## Dependencies

- `pnpm-workspace.yaml` sets `minimumReleaseAge` (14 days); don't bypass it.
- Prisma packages (`prisma`, `@prisma/client`, `@prisma/adapter-better-sqlite3`)
  are pinned to the same exact version. Upgrade them together.
- Check licenses (we use `ua-parser-js` v1 because v2 is AGPL).
- Native modules (better-sqlite3) must stay external in the Vite SSR build.

## Privacy & security (non-negotiable)

- Never store or log raw IP addresses. Country + daily salted visitor hash only.
- Never log owner keys (`k_…`) or admin tokens. Paths go through
  `redactPath()`; keep it that way for any new secret-bearing route.
- Private links answer "not found" to anyone else (no existence leaks).
- `X-Forwarded-For` is trusted only with `TRUST_PROXY` behind nginx.

## Logs

pino JSON lines on stdout, one per request (with `requestId`, also sent as
`X-Request-Id`) plus domain events. Levels: 30 info, 40 warn, 50 error.

```bash
docker compose logs web --no-log-prefix | jq 'select(.level >= 40)'      # local
ssh <vps> 'cd ~/url-shortener && docker compose -f docker-compose.prod.yml logs web --no-log-prefix --since 1h' \
  | jq 'select(.level >= 50)'                                               # production
```

Docker keeps 3 × 10 MB of logs per container (roughly 100k request lines).

## Commits & branches

- Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`…) whose body
  explains **why**. Releases are computed from them (semantic-release).
- `feature/* -> dev` (squash; the PR title is the commit), `dev -> main`
  (merge commit). Every merge to `main` releases and deploys.
