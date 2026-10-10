# Deploying d3b.it/r (VPS + Docker + nginx, via GitHub Actions)

```
feature/* ──PR──▶ dev ──PR──▶ main ──▶ Release workflow
                  CI          CI        1. CI (same checks as PRs)
                                        2. semantic-release: next version from commits,
                                           git tag + GitHub Release (vX.Y.Z)
                                        3. Docker image -> ghcr.io/d3bitcom/url-shortener:vX.Y.Z (+ latest)
                                        4. SSH to the VPS: pull, up -d, wait for healthy;
                                           roll back to the previous version if not
```

The VPS never builds anything (CPU stays with the other services); it only
pulls released images. Only `fix`/`feat`/breaking commits produce a release;
a merge with only `docs:`/`chore:` commits releases nothing and deploys nothing.
The first release is `v1.0.0`.

## One-time setup

### 1. On the VPS

```bash
# A dedicated user that can run docker, nothing else.
sudo adduser --disabled-password deploy
sudo usermod -aG docker deploy

# Its SSH key for GitHub Actions (put the PRIVATE key in the SSH_KEY secret).
sudo -u deploy ssh-keygen -t ed25519 -N "" -f /home/deploy/.ssh/gh_actions
sudo -u deploy sh -c 'cat ~/.ssh/gh_actions.pub >> ~/.ssh/authorized_keys'

# App config, next to the compose file CI uploads.
sudo -u deploy mkdir -p /home/deploy/url-shortener
sudo -u deploy cp deploy/.env.example /home/deploy/url-shortener/.env   # then edit it
#   PUBLIC_URL=https://d3b.it
#   ANALYTICS_SALT / COOKIE_SECRET: openssl rand -hex 32
#   ADMIN_TOKEN: openssl rand -hex 24
#   HOST_PORT: a free port on 127.0.0.1
```

If the GHCR package is **private** (the default for a private repo), let the
VPS pull it: create a GitHub token with only `read:packages`, then
`sudo -u deploy docker login ghcr.io -u <github-user>` (paste the token).

### 2. nginx

d3b.it keeps redirecting to d3bit.com; only `/r` goes to the app.

```bash
sudo cp deploy/url-shortener-proxy.conf /etc/nginx/snippets/
# Merge the two /r locations from deploy/nginx.conf.example into the d3b.it
# server block (adjust the port in the snippet if HOST_PORT isn't 3000).
sudo nginx -t && sudo systemctl reload nginx
```

`nginx.conf.example` was checked with `nginx -t`, and its routing was tested:
`/` → d3bit.com, `/r` + `/r/…` → app, `/rabbit` → d3bit.com, oversized
bodies → 413.

### 3. GitHub

Repository → Settings → Environments → **production** (optionally require
your approval before each deploy), then add:

| Kind     | Name              | Value                                                                  |
| -------- | ----------------- | ---------------------------------------------------------------------- |
| secret   | `SSH_HOST`        | VPS hostname or IP                                                     |
| secret   | `SSH_USER`        | `deploy`                                                               |
| secret   | `SSH_KEY`         | private key from step 1                                                |
| secret   | `SSH_KNOWN_HOSTS` | output of `ssh-keyscan -t ed25519 <host>` (verify the fingerprint!)    |
| variable | `DEPLOY_PATH`     | optional; default `url-shortener` (relative to the deploy user's home) |
| variable | `PUBLIC_URL`      | optional; default `https://d3b.it` (post-deploy check)                 |

Branch protection: require PRs + the CI checks on `dev` and `main`; allow
squash merges for `→ dev` and merge commits for `dev → main`.

## Day to day

| Task                      | How                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------- |
| Release + deploy          | merge a PR into `main`                                                                            |
| Redeploy / roll back      | Actions → Release → Run workflow → `version: v1.4.2`                                              |
| Which version runs        | `cat ~/url-shortener/.deployed-version` on the VPS                                                |
| Logs                      | `docker compose -f docker-compose.prod.yml logs web --no-log-prefix \| jq 'select(.level >= 50)'` |
| Backups, secrets rotation | see [docs/runbook.md](../docs/runbook.md)                                                         |

Manual deploy without Actions (e.g. first boot):

```bash
cd ~/url-shortener
APP_VERSION=v1.0.0 docker compose -f docker-compose.prod.yml --env-file .env pull
APP_VERSION=v1.0.0 docker compose -f docker-compose.prod.yml --env-file .env up -d
```

## Security notes

- The container listens on `127.0.0.1` only; requests must come through
  nginx, which is why trusting its `X-Forwarded-For` (`TRUST_PROXY=true`) is
  safe.
- The SSH host key is pinned via `SSH_KNOWN_HOSTS`; the job refuses unknown
  hosts.
- `.env` on the VPS holds the secrets; it never leaves the server.
