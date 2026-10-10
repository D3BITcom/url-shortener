# URL Shortener (d3b.it/r)

Shorten URLs, redirect, and see who clicks: countries, devices, referrers and
daily trends, without storing raw IP addresses. Links are private by default
and owned anonymously through a secret lobby link; public links can make the
leaderboard. Admins can moderate.

## Tech Stack

```
url-shortener/
├── applications/web/    # React Router v7 app: controllers (loaders/actions) + views
├── libs/engine/         # Domain model: services, rules, repository interfaces
└── libs/database/       # Prisma + SQLite: schema, migrations, repositories
```

| Technology                                                            | Description                                                                                       |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| [pnpm](https://pnpm.io/)                                              | Fast, disk-efficient package manager with built-in monorepo support via workspaces                |
| [Turbo](https://turbo.build/)                                         | High-performance build system for monorepos. Runs tasks in parallel and caches results            |
| [React](https://react.dev/)                                           | Library for building user interfaces with components                                              |
| [React Router v7](https://reactrouter.com/)                           | Full-stack React framework. Handles routing, data loading (loaders), mutations (actions), and SSR |
| [TypeScript](https://www.typescriptlang.org/)                         | Typed superset of JavaScript for catching errors at compile time                                  |
| [Tailwind CSS](https://tailwindcss.com/)                              | Utility-first CSS framework, with an old-school design system in `components/ui`                  |
| [Vite](https://vite.dev/)                                             | Fast build tool and dev server with hot module replacement                                        |
| [Prisma](https://www.prisma.io/) + SQLite                             | ORM, migrations and a single-file database                                                        |
| [Vitest](https://vitest.dev/) + [Playwright](https://playwright.dev/) | Unit, integration and end-to-end tests                                                            |

More reading:

- [CONTRIBUTING.md](./CONTRIBUTING.md): setup, conventions, migrations, releases
- [AGENTS.md](./AGENTS.md): how we work (for agents and humans)
- [docs/architecture.md](./docs/architecture.md), [docs/decisions.md](./docs/decisions.md), [docs/runbook.md](./docs/runbook.md)

## Local Setup

Requires Node 22 and pnpm 10.

```bash
pnpm install
cp .env.example .env
pnpm geoip:download     # optional, enables country stats
pnpm dev                # applies migrations, then starts the dev server
```

Open `http://localhost:3000/r` (the admin console is at `/r/admin`, token
`ADMIN_TOKEN` from `.env`).

Run the checks with `pnpm test`, `pnpm test:e2e`, `pnpm typecheck` and
`pnpm format:check`.

## Docker Setup

```bash
docker compose up --build
```

Open `http://localhost:3000/r`

| Page             | URL                                                               |
| ---------------- | ----------------------------------------------------------------- |
| Create a link    | `http://localhost:3000/r`                                         |
| My links (lobby) | `http://localhost:3000/r/me`                                      |
| Leaderboard      | `http://localhost:3000/r/top`                                     |
| Admin console    | `http://localhost:3000/r/admin` (token: `local-demo-admin-token`) |

The compose file ships demo-only secrets so it runs with zero setup; never
reuse them anywhere public.

Data is stored in the `app-data` volume and survives restarts
(`docker compose down -v` deletes it). Migrations run automatically on start.

Locally, every visitor comes from a private IP, so countries show as
"Unknown". Geolocation works once deployed (see below).

## Deployment

Production runs at `d3b.it/r` on a VPS behind nginx. Every merge to `main`
releases a version and deploys it automatically; see
[deploy/README.md](./deploy/README.md).
