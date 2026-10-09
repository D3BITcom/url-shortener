# URL Shortener

Shorten URLs, redirect, and see who clicks: countries, devices, referrers and
daily trends, without storing raw IP addresses.

## Tech Stack

```
url-shortener/
├── applications/web/    # React Router v7 app: controllers (loaders/actions) + views
├── libs/engine/         # Domain model: services, rules, repository interfaces
└── libs/database/       # Prisma + SQLite: schema, migrations, repositories
```

| Technology                                    | Description                                                                                       |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| [pnpm](https://pnpm.io/)                      | Fast, disk-efficient package manager with built-in monorepo support via workspaces                |
| [Turbo](https://turbo.build/)                 | High-performance build system for monorepos. Runs tasks in parallel and caches results            |
| [React](https://react.dev/)                   | Library for building user interfaces with components                                              |
| [React Router v7](https://reactrouter.com/)   | Full-stack React framework. Handles routing, data loading (loaders), mutations (actions), and SSR |
| [TypeScript](https://www.typescriptlang.org/) | Typed superset of JavaScript for catching errors at compile time                                  |
| [Tailwind CSS](https://tailwindcss.com/)      | Utility-first CSS framework, with shadcn/ui-style components                                      |
| [Vite](https://vite.dev/)                     | Fast build tool and dev server with hot module replacement                                        |
| [Prisma](https://www.prisma.io/) + SQLite     | ORM, migrations and a single-file database                                                        |
| [Vitest](https://vitest.dev/)                 | Unit and integration tests                                                                        |

Architecture, conventions and the migration workflow are in
[CONTRIBUTING.md](./CONTRIBUTING.md).

## Local Setup

Requires Node 22 and pnpm 10.

```bash
pnpm install
cp .env.example .env    # set ANALYTICS_SALT=$(openssl rand -hex 32)
pnpm db:deploy          # creates data/app.db
pnpm geoip:download     # optional, enables country stats
pnpm dev
```

Open `http://localhost:3000`

Run the checks with `pnpm test`, `pnpm typecheck` and `pnpm format:check`.

## Docker Setup

```bash
docker compose up --build
```

Open `http://localhost:3000`

Data is stored in the `app-data` volume and survives restarts
(`docker compose down -v` deletes it). Migrations run automatically on start.

Locally, every visitor comes from a private IP, so countries show as
"Unknown". Geolocation works once deployed (see below).

## Deployment

For a VPS behind nginx with TLS, see [deploy/README.md](./deploy/README.md).
