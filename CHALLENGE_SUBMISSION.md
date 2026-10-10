# Submission

Live target: `d3b.it/r/<code>`. Locally: `docker compose up --build`, then
http://localhost:3000/r (admin console at `/r/admin`, token
`local-demo-admin-token`).

## What I Did

I prioritized **architecture people can collaborate on, correctness,
privacy-first analytics, and ownership without accounts**, and kept the
original's personality in the UI instead of replacing it with a generic look.
Every commit message explains its reasoning; `git log` reads as the story of
the refactor. Architecture and decisions are written up in [docs/](./docs) and
[AGENTS.md](./AGENTS.md).

**Architecture (MVC on React Router's own conventions)**

- `libs/engine`, the model: pure TypeScript domain (services, rules,
  permission checks, repository interfaces), with no framework or database
  imports.
- `libs/database`: Prisma + SQLite, the only package that knows Prisma.
  Migrations are committed, applied on container start, and the one
  non-trivial one (a backfill) is hand-edited and commented.
- `applications/web`: route `loader`/`action` = thin controllers, route
  components + `app/components` = views, `app/.server/container.ts` = the
  single composition root. No DI framework and no speculative interfaces.

**The original flaws, fixed**

| Problem                   | Fix                                                                                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 9 possible codes          | 7 random chars without look-alikes (CSPRNG, not enumerable). Collisions are caught by the DB unique constraint and retried, so there's no race.             |
| In-memory storage         | Prisma + SQLite (WAL) on a Docker volume                                                                                                                    |
| No validation             | http(s) only, no embedded credentials, real hostname, length cap, can't target itself. The old code would redirect to `javascript:` URLs.                   |
| No error handling         | `DomainError`s carry user-facing messages; everything else is logged with a request id and shown as a generic error. Env is validated at boot.              |
| No stats                  | Per-click events: country, browser, OS, device, referrer, 30-day chart, unique visitors, bot filtering                                                      |
| No separation of concerns | See architecture above                                                                                                                                      |
| Ugly UI                   | Kept the original's loud old-school look but made it a consistent, accessible design system (contrast-checked tokens, reusable components), mobile-friendly |

**Product features**

- **Ownership without accounts.** Your first link creates an anonymous owner,
  remembered by a signed cookie, plus a **secret lobby link** to get back in
  from any device. Only the key's hash is stored.
- **Private by default**, with an opt-in **public leaderboard** (Hall of Fame).
  The leaderboard resists spam: ranked by unique visitors, domain only, links
  appear after an hour, admins can hide entries.
- **Custom endings** (`d3b.it/r/ShOrTUr1`): unique ignoring case (no
  `Promo`/`promo` look-alikes), reserved words blocked, renamable only until
  the first click so shared links never break.
- **Admin console** (token login, rate limited): search, hide, delete.

**Analytics, privacy-first**

- Raw IPs are never stored or logged: only the country (offline DB-IP lookup)
  and a daily-rotating salted visitor hash (Plausible's approach).
- Link-preview bots and browser prefetches don't inflate counts. Recording is
  fire-and-forget, so it never slows a redirect.

**Security / abuse**

- Per-IP rate limits (link creation, admin login), honeypot, optional
  Cloudflare Turnstile (invisible for most people, off without keys), 16 KB
  body limit, security headers, non-root container.
- **The client IP is trustworthy.** `react-router-serve` doesn't expose the
  socket address, so I switched to React Router's official custom-server
  template. `X-Forwarded-For` is only honoured with `TRUST_PROXY` (behind
  nginx); client-injected entries are ignored.

**Operations:** structured JSON logs (request ids, redacted secrets, capped by
Docker at 3 × 10 MB), health check, and a CI/CD pipeline: PRs into `dev`, and
merges into `main` are released with semantic versioning and deployed to the
VPS as a pinned image, with automatic rollback if the health check fails.

**Testing:** unit tests for the domain rules (including every permission
rule), integration tests against real migrated SQLite, and Playwright
end-to-end tests for the main flows (create, privacy between two browsers,
secret-link login, rename lock, admin moderation).

## What I Would Do With More Time

- **D3BIT account login** (planned on its own branch): link an anonymous owner
  to an account; the `accountId` column is already in place.
- **Scale-out.** The rate limiters are in-memory (fine for one container).
  With several instances they'd move to Redis or nginx `limit_req`; unique
  visitors would move to a daily rollup table at high volume.
- **More product:** link expiry, QR codes, CSV export, date-range picker,
  user reports on leaderboard entries.
- **CSP header**: it needs nonce support for React Router's inline scripts.

## AI Usage

I used **Claude Code** (Claude Opus 5.5) for the whole challenge. **The full
session transcript is included for transparency.**

How I worked with it:

- I drove the product and architecture decisions: MVC structure, SQLite but
  swappable, analytics scope and privacy, ownership via secret links instead
  of accounts, public/private links and the leaderboard, custom slugs,
  deploying behind my own nginx on `d3b.it/r`, and keeping the original's
  old-school style.
- Early on it ran ahead and implemented before I'd approved a plan. I pulled
  it back to plan-first; from then on we discussed, then **mocked up the
  screens together** (clickable design canvas) before any code was written.
  That rule is now in `AGENTS.md` for future sessions.
- It implemented layer by layer (engine → database → web → Docker), using
  two parallel sub-agents only at the end for independent work (docs/CI and
  e2e tests), and verified every step by running the result: tests, curl with
  separate cookie jars as different users, headless-browser screenshots, and
  the real Docker image.

Things that verification caught:

- npm's `latest` tag for the Prisma CLI pointed at a day-old **8.0 release
  candidate** while the client was on 7.10, so the versions are pinned and a
  14-day `minimumReleaseAge` guards every install.
- `ua-parser-js` v2 is **AGPL**, so v1 (MIT) is used.
- The production bundle **crashed** on better-sqlite3's native loader; only
  running the Docker image showed it.
- A schema migration needed a **hand-written backfill** that Prisma flagged
  but couldn't infer.
- Following the README in a **fresh clone** exposed first-run problems, which
  were fixed.

Example prompts:

> "analyze the repo and lmk what you find, run it locally"

> "lets standardize a Model View Controller aspect to this (I'd like to make sure the repo can be collaborated easily w/ others and new future db migrations are standardized etc) [...] make sure the repo is not over-engineered yet scalable enough"

> "when a non registered user create a short url we give them the short url + a private url if they'd like to save it locally so they log back in [...] also I'd like the slug url to be modifiable if it unique and above 3 chars"

> "calm variant looks lame lets forget that heh, cool direction on the main direction [...] one shot this for me for local deployment and I'll judge"

## Feedback

<!-- Any feedback on the challenge? Was it clear? Too easy/hard? Suggestions? -->
