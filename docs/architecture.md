# Architecture

## Layers

```
┌──────────────────── applications/web ─────────────────────┐
│ server.js / server/app.ts   Express: real client IP, logs  │
│ app/routes/*                controllers + page views       │
│ app/components/*            design system + features       │
│ app/.server/*               container, config, session,    │
│                             logger, geoip, turnstile       │
└──────────────┬────────────────────────────────────────────┘
               │ calls services, passes repositories in
┌──────────────▼─────────────┐   ┌──────────────────────────┐
│ libs/engine (model)        │◄──│ libs/database            │
│ ShortUrlService, access    │   │ Prisma schema+migrations │
│ OwnerService, Analytics…   │   │ Prisma*Repository        │
│ repository interfaces      │   │ (implements engine ports)│
└────────────────────────────┘   └──────────────────────────┘
```

- **engine** knows the rules and nothing about HTTP or SQL.
- **database** implements the engine's repository interfaces with Prisma.
- **web** wires everything in `app/.server/container.ts` and keeps
  controllers thin.

Everything is served under the `/r` basename (`react-router.config.ts` +
Vite `base`), because production runs at `d3b.it/r/...` behind nginx.

## Identity: cookies → Viewer

There are no user accounts (yet). Two signed, httpOnly cookies, path `/r`:

| Cookie      | Holds                                      | Lifetime               |
| ----------- | ------------------------------------------ | ---------------------- |
| `d3b_owner` | the owner's secret key `k_…`               | 400 days (browser max) |
| `d3b_admin` | `true` after logging in with `ADMIN_TOKEN` | 12 hours               |

`app/.server/session.ts#getViewer` turns them into the engine's
`Viewer { ownerId, isAdmin }`. That is the only identity the engine sees.

The owner key is also shown as a **secret lobby link**
(`/r/key/k_…`), the way back in from another device. Only
`sha256(key)` is stored.

## Request flows

### Create a link (`POST /r`, `routes/_index.tsx`)

1. Parse the form (url, slug, isPublic).
2. Guards: honeypot field → per-IP rate limit → Turnstile (if enabled).
3. `OwnerService.authenticateOrCreate(cookie)`: reuse the owner or create
   one (and set the cookie).
4. `ShortUrlService.shorten()`: normalize and validate the URL, validate the
   custom slug or generate a random code, insert. The unique index on
   `codeKey` decides collisions (random codes retry, custom slugs report
   "taken").
5. Render the result: short link + secret lobby link.

### Redirect (`GET /r/:code`, `routes/$code.tsx`)

1. `ShortUrlService.resolve(code)`: case-insensitive lookup. Hidden links still
   redirect; deleted links 404 (styled page).
2. Unless it's a browser prefetch, record the click in the background
   (fire-and-forget): country (offline GeoIP), browser/OS/device, bot flag,
   referrer host, daily visitor hash. Never the raw IP.
3. `302` with `Cache-Control: private, no-store`, so every click reaches us.

### Stats (`GET /r/stats/:code`, `routes/stats.$code.tsx`)

1. `getViewer()` from cookies.
2. `ShortUrlService.getForViewer(code, viewer)` applies `canViewStats`:
   owner and admins always; others only if public and not hidden. Otherwise
   **not found**, so private links don't reveal they exist.
3. `AnalyticsService.statsFor()` → totals, uniques, bots, 30-day series,
   breakdowns.
4. Owners/admins also get the manage panel (visibility, rename until first
   click, delete), posted back to the same route's `action`.

Other routes: `/r/me` (lobby), `/r/top` (leaderboard), `/r/admin` and
`/r/admin/login`, `/r/healthz`.

## Data model

```
Owner 1 ─── * ShortUrl 1 ─── * Click
```

**Owner**: `id`, `secretHash` (unique, sha256 of the key), `accountId?`
(unique; for the future D3BIT login), `createdAt`.

**ShortUrl**

| Column         | Notes                                                         |
| -------------- | ------------------------------------------------------------- |
| `code`         | as created/displayed, e.g. `ShOrTUr1`                         |
| `codeKey`      | `lower(code)`, **unique**: lookups and uniqueness ignore case |
| `targetUrl`    | normalized http(s) URL                                        |
| `ownerId?`     | `SET NULL` if the owner is deleted                            |
| `isPublic`     | stats visible to all, eligible for the leaderboard            |
| `isCustomSlug` | counts toward the 20-per-owner limit                          |
| `hiddenAt?`    | admin moderation: still redirects, off public surfaces        |

**Click**: one row per redirect (an event log). `day` (UTC `YYYY-MM-DD`),
`country?`, `browser?`, `os?`, `device`, `referrerHost?`, `visitorId`
(daily salted hash of IP + UA), `isBot`. Deleted with its link (cascade).

## Ports and adapters

| Port (engine)                                              | Implementations                                        |
| ---------------------------------------------------------- | ------------------------------------------------------ |
| `ShortUrlRepository`, `ClickRepository`, `OwnerRepository` | Prisma (database), in-memory test doubles              |
| `GeoResolver`                                              | `MmdbGeoResolver` (DB-IP Lite file), `NullGeoResolver` |
| `HumanVerifier`                                            | `TurnstileVerifier`, `DisabledHumanVerifier`           |
