# Deployment

This covers a single-host deployment behind a reverse proxy you control. It
does not assume Cloudflare specifically — `AUTH_MODE=proxy` works with any
identity-aware proxy that terminates auth and forwards a signed JWT in a
header (Cloudflare Access, oauth2-proxy, Pomerium, ...).

## Stack

```
your reverse proxy / tunnel (optional, your choice of tool)
  -> Caddy       (/ -> Haven SPA | /api/* -> Haven API)
       -> api    (Fastify + Drizzle, holds the data-provider secret, webhook + reconciliation cron)
            -> db (Postgres, internal network only)
```

`docker-compose.yml` defines `db`, `api` and `caddy`, pinned to
the compose project name `haven` so volumes do not depend on the
checkout path. Port `8080` is published on the host for local checks; in a
real deployment nothing else needs to be exposed — whatever sits in front
(a tunnel, a load balancer, a reverse proxy on the same box) only needs to
reach `caddy:80` on the compose network.

## One-time setup

1. `cp .env.example .env` and fill in every value (see the table below).
2. If you plan to use `DATA_PROVIDER=pluggy`, create an application at
   `dashboard.pluggy.ai`, copy `PLUGGY_CLIENT_ID` / `PLUGGY_CLIENT_SECRET`,
   and generate a webhook secret with `openssl rand -hex 32` into
   `WEBHOOK_SECRET`. Point the webhook URL configured in the Pluggy
   dashboard at `WEBHOOK_PUBLIC_URL` (the `?token=` form works even when a
   custom header cannot be guaranteed by the delivery).
3. If you plan to put an identity-aware proxy in front (recommended for any
   non-local deployment), configure `AUTH_JWKS_URL`, `AUTH_ISSUER`,
   `AUTH_AUDIENCE` and `AUTH_IDENTITY_HEADER` to match that proxy's setup,
   and set `AUTH_MODE=proxy`.
4. `docker compose up -d --build`, wait for `db` and `api` to
   report healthy (`docker compose ps`).
5. Run the migration once, as a one-off container:
   `docker compose run --rm api node dist/migrate.js`.

Migrations never run automatically at container boot — this is a deliberate
choice so that deploying an update, or a crash-restart, never silently
alters the schema. Run the migration step explicitly after every deploy
that ships one.

## Exposing it to the internet

This repository intentionally does not commit to one exposure method. A
Cloudflare Tunnel, a Tailscale Funnel, an ngrok tunnel, or a plain reverse
proxy with a certificate all work the same way from Caddy's point of view:
something reaches `caddy:80` on the compose network. If you use a tunnel
client as a container, add it as an extra service in a local, gitignored
compose override (`docker-compose.override.yml`) rather than committing
your tunnel name or token anywhere in this repository.

## Sub-path routing

`infra/caddy/Caddyfile` serves Haven at the domain root: `/` is the SPA and
`/api/*` reverse-proxies to the `api` service. If Haven needs to share a
domain with something else, use `infra/caddy/Caddyfile.subpath` instead —
it mounts the SPA and API under `/haven/*` — and build the web image with
`--build-arg BASE_PATH=/haven/` (passed through as `VITE_BASE_PATH` in
`infra/caddy/Dockerfile`) so the SPA's asset URLs and API base match the
prefix.

## Environment variable reference

| Key | Required | Notes |
|---|---|---|
| `DATABASE_URL` | always | Postgres connection string. |
| `APP_TIMEZONE` | no (default `America/Sao_Paulo`) | Timezone used by both cron schedules. |
| `AUTH_MODE` | always | `proxy` (production) or `dev` (fixed local identity; refused when `NODE_ENV=production`). |
| `AUTH_JWKS_URL`, `AUTH_ISSUER`, `AUTH_AUDIENCE` | required when `AUTH_MODE=proxy` | JWT verification parameters for your identity-aware proxy. |
| `AUTH_IDENTITY_HEADER` | no (default `cf-access-jwt-assertion`) | Header the proxy forwards the signed JWT in. |
| `DATA_PROVIDER` | always | `mock` (deterministic synthetic dataset, no account needed) or `pluggy` (real Open Finance Brasil sync). |
| `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET` | required when `DATA_PROVIDER=pluggy` | From `dashboard.pluggy.ai`. |
| `WEBHOOK_SECRET` | always | Shared secret for `POST /webhooks`, min 16 chars. |
| `WEBHOOK_PUBLIC_URL` | required when `DATA_PROVIDER=pluggy` | The URL you register with the data provider. |
| `RECONCILE_CRON` / `SNAPSHOT_CRON` | no | Cron expressions for the two scheduled jobs. |

## Deploying an update

```bash
git pull
docker compose up -d --build
docker compose run --rm api node dist/migrate.js
```
