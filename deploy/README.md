# Deploying to a VPS (Docker + nginx)

The app runs as one container on `127.0.0.1`, with nginx in front handling
TLS. SQLite lives on a Docker volume.

## 1. DNS

Point an `A` (and `AAAA` if you have IPv6) record for your domain at the VPS.
If the DNS is on Cloudflare, either "DNS only" (grey cloud) or "Proxied" (orange
cloud) works: the proxy setting applies per record, so it doesn't affect other
services on the same server. With the orange cloud, set `TRUST_PROXY=2` (two
hops: Cloudflare, then nginx) so the app sees real client IPs.

## 2. Configure and start

```bash
git clone <repo> url-shortener && cd url-shortener
cp deploy/.env.example deploy/.env
# Edit deploy/.env: PUBLIC_URL=https://your-domain, ANALYTICS_SALT=$(openssl rand -hex 32),
# and a free HOST_PORT.
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env up -d --build
curl -s http://127.0.0.1:3000/healthz   # {"status":"ok"}
```

Migrations run automatically on every start (`prisma migrate deploy`).

## 3. nginx + TLS

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/url-shortener
# Replace your-domain.example (and the port if HOST_PORT isn't 3000)
sudo ln -s /etc/nginx/sites-available/url-shortener /etc/nginx/sites-enabled/
sudo certbot --nginx -d your-domain.example
sudo nginx -t && sudo systemctl reload nginx
```

## Operations

| Task   | Command                                                                                               |
| ------ | ----------------------------------------------------------------------------------------------------- |
| Update | `git pull && docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env up -d --build`   |
| Logs   | `docker compose -f deploy/docker-compose.prod.yml logs -f web`                                        |
| Backup | `docker run --rm -v deploy_app-data:/data -v $PWD:/backup alpine tar czf /backup/data.tgz -C /data .` |

The GeoIP database is baked into the image, so rebuilding monthly picks up
DB-IP's newest release.

## Security notes

- The container only listens on `127.0.0.1`. Requests must go through
  nginx, which is why trusting its `X-Forwarded-For` is safe.
- The links list and stats pages are public (there are no accounts). To
  restrict them, add `auth_basic` to a `location /links` block in nginx.
