# Decision log

Short entries: what we chose and why. Add one when you make a choice someone
might later question. Newest at the bottom.

**SQLite + Prisma 7.10 (pinned).** One file, no extra container, fine at
this scale. Prisma keeps a later switch to Postgres to a provider/adapter
change plus a new baseline migration. CLI, client and adapter are pinned to
the same version because npm's `latest` tag once pointed the CLI at an 8.0
release candidate while the client was on 7.10.

**Custom Express server instead of `react-router-serve`.** Loaders need the
real client IP (rate limiting, geolocation); `react-router-serve` doesn't
expose it. Based on React Router's official custom-server template.

**`TRUST_PROXY` is opt-in.** Without a proxy, `X-Forwarded-For` is
attacker-controlled. Behind nginx we trust exactly one hop, so Express reads
the address nginx appended. The container only listens on `127.0.0.1` in
production, so nobody can bypass nginx.

**Anonymous owners with secret keys (hash only).** Ownership without
accounts: whoever holds the `k_…` key owns the links. The key is ~143 bits of
randomness, so a plain SHA-256 is enough (slow hashes are for low-entropy
passwords). A D3BIT login will attach `accountId` later.

**Case-insensitive codes via `codeKey`.** `Promo` and `promo` can't both
exist, which prevents look-alike phishing; `d3b.it/r/shortur1` still finds
`ShOrTUr1`.

**Renaming only until the first click.** After a link has been used, someone
has it; renaming would silently break it.

**No "same URL → same link" dedupe.** With owners, two people shortening
the same URL need separate links and separate stats.

**Leaderboard anti-spam rules.** Public links only (opt-in), ranked by
unique visitors (not raw clicks), destination shown as domain only, links
must be an hour old, admins can hide entries. A leaderboard otherwise
rewards botting a scam link to the top.

**Admin via `ADMIN_TOKEN` until D3BIT auth.** Simplest thing that works: one
token, constant-time compare, rate-limited login, 12h cookie. Unset = no
admin area at all (404).

**Turnstile optional, fail-closed.** Mostly invisible for people, works
without Cloudflare's proxy. Off when no keys are set (local, reviewers). When
on and Cloudflare can't be reached, creation is refused rather than left
unprotected.

**DB-IP Lite for geolocation.** CC BY 4.0, no account or license key, same
`.mmdb` format as MaxMind. Downloaded at image build; credited in the footer.

**pino JSON logs + Docker rotation (3 × 10 MB).** Machine-readable (jq,
agents), no log infrastructure to run. The cap is roughly 100k request
lines. No IPs; owner keys redacted.

**`ua-parser-js` v1, not v2.** v2 is AGPL-licensed; v1 is MIT.

**No chart library.** One bar series and some proportion bars are a few
divs; a chart library would be the largest dependency in the bundle.

**Old-school design system.** The original "intentionally ugly" UI had
personality the owner liked. We kept the gradient, dashed cards, wavy
headings and pill button, made contrast readable and turned them into tokens
and components (`app.css`, `components/ui`).
