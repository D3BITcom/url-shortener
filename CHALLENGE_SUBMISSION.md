# Submission

## What I Did

I prioritized **architecture people can collaborate on, correctness, and
analytics**, then a clean UI on top. Every commit message explains its
reasoning; `git log` reads as the story of the refactor.

**Architecture (MVC on React Router's own conventions)**

- `libs/engine`, the model: pure TypeScript domain (services, rules,
  repository interfaces), with no framework or database imports.
- `libs/database`: Prisma + SQLite, the only package that knows Prisma.
  Switching databases is documented and touches no domain or UI code.
- `applications/web`: route `loader`/`action` = thin controllers, route
  components + `app/components` = views, `app/.server/container.ts` = the
  single composition root. No DI framework and no speculative interfaces.
- [CONTRIBUTING.md](./CONTRIBUTING.md) documents the layering rules and the
  migration workflow (`pnpm db:migrate --name <change>`).

**The original flaws, fixed**

| Problem                   | Fix                                                                                                                                                                                      |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 9 possible codes          | 7 chars over a 57-char alphabet without look-alikes (~1.9 trillion), CSPRNG, random (not enumerable). Collisions are caught by the DB unique constraint and retried, so there's no race. |
| In-memory storage         | Prisma + SQLite (WAL) on a Docker volume, committed migrations applied on start                                                                                                          |
| No validation             | http(s) only, no embedded credentials, real hostname, length cap, can't target itself. The old code would redirect to `javascript:` URLs.                                                |
| No error handling         | `DomainError`s carry user-facing messages; everything else is logged and shown as a generic error. Env is validated at boot.                                                             |
| No stats                  | Per-click events: country, browser, OS, device, referrer, daily chart, unique visitors, bot filtering                                                                                    |
| No separation of concerns | See architecture above                                                                                                                                                                   |
| Ugly UI                   | shadcn-style components, light and dark themes, responsive, loading and error states, works without JS                                                                                   |

**Analytics, privacy-first**

- Raw IPs are never stored: only the country (offline DB-IP lookup) and a
  daily-rotating salted visitor hash (Plausible's approach).
- Link-preview bots (Slack, Twitter...) and browser prefetches don't inflate
  counts. Recording is fire-and-forget, so it never slows a redirect.

**Security / abuse**

- Per-IP rate limit on link creation (429 + Retry-After), honeypot field,
  16 KB body limit, basic security headers, non-root container.
- **The client IP is trustworthy.** `react-router-serve` doesn't expose the
  socket address, so I switched to React Router's official custom-server
  template. `X-Forwarded-For` is only honoured with `TRUST_PROXY`, and
  verified tests show client-injected entries are ignored.

**Testing:** 40 unit tests (engine) + integration tests that run the real
migrations against a temporary SQLite file. CI runs format, typecheck, tests,
build and the Docker build.

**Deployment:** `deploy/` contains a production compose file (loopback-only)
plus a validated nginx config and runbook.

## What I Would Do With More Time

- **Accounts / ownership.** The links list and stats are public, and identical
  URLs share one link. With users, links become per-owner and stats private.
- **Scale-out.** The rate limiter is in-memory (fine for one container). With
  several instances it would move to Redis or nginx `limit_req`. Unique-visitor
  counting would move to a daily rollup table at high volume.
- **More product:** custom aliases, link expiry, QR codes, CSV export, date
  range picker on stats.
- **E2E tests** (Playwright) for the main flows. I checked them manually with
  a headless browser, but they aren't automated.
- **CSP header**: it needs nonce support for React Router's inline scripts.

## AI Usage

I used **Claude Code** (Claude Opus 5.5) as a pair programmer for the whole
challenge. **The full session transcript is included for transparency.**

How I worked with it:

- I drove the product and architecture decisions: MVC structure, keeping
  SQLite but making it swappable, analytics scope, privacy, and deploying
  behind my own nginx rather than Cloudflare's proxy (my VPS also hosts
  latency-sensitive services).
- Claude explored the repo, proposed plans, implemented layer by layer and
  verified each step by running the result (tests, curl, headless browser,
  Docker), not just type-checking.

Things that verification caught, which I'd point to as the value of working this way:

- npm's `latest` tag for the Prisma CLI pointed at a day-old **8.0 release
  candidate** while the client was on 7.10, so the versions were pinned and
  a 14-day `minimumReleaseAge` was added to the workspace.
- `ua-parser-js` v2 is **AGPL**, so v1 (MIT) is used.
- The production bundle **crashed** on better-sqlite3's native loader.
  Dev mode didn't show it; only running the Docker image did.
- The GeoIP download failed silently on Alpine (BusyBox `date`).
- Following the README in a **fresh clone** exposed two first-run problems
  (invalid placeholder secret, missing migrations), which were fixed.

Example prompts:

> "analyze the repo and lmk what you find, run it locally"

> "I'd like to add a bit more of analytics as well (where a users from ip, other ideas?)"

> "my vps isn't orange clouded as I run services that require very low latencies [...] I do have nginx reverse proxy, perhaps use that instead"

> "lets standardize a Model View Controller aspect to this (I'd like to make sure the repo can be collaborated easily w/ others and new future db migrations are standardized etc) [...] make sure the repo is not over-engineered yet scalable enough"

## Feedback

<!-- Any feedback on the challenge? Was it clear? Too easy/hard? Suggestions? -->
