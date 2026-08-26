# Security policy

## Threat model

This repository is a single-owner, self-hosted personal finance app. There is
no multi-tenant user table: one operator deploys one instance for themselves,
delegates authentication to an identity-aware proxy in front of the API
(Cloudflare Access, oauth2-proxy, Pomerium, ...), and is the only person who
ever has a valid identity for that deployment.

Given that model, the assets worth protecting are:

- The operator's Open Finance credentials and data provider secrets
  (`PLUGGY_CLIENT_ID` / `PLUGGY_CLIENT_SECRET`).
- The webhook shared secret (`WEBHOOK_SECRET`), which authorizes the data
  provider to push sync events into the API.
- The Postgres database holding synced accounts, transactions and
  investments.

## How secrets are handled

- All secrets live in a local, gitignored `.env` file. `.env.example` ships
  only placeholders; a pre-flight check in CI fails if any credential-shaped
  value (an API key prefix, a JWT, a long base64 blob) appears there.
- The webhook secret is compared with `crypto.timingSafeEqual` after a
  length pre-check, so a wrong guess cannot be distinguished by timing.
- `AUTH_MODE=dev` (a fixed local identity, no proxy required) is refused at
  startup whenever `NODE_ENV=production`, so a misconfigured deployment
  cannot accidentally run open.
- Database migrations are a manual, explicit step
  (`node dist/migrate.js`) — they never run automatically at container boot,
  so a compromised or buggy image cannot silently alter the schema.
- The demo/mock data provider never talks to a real bank; the seed script
  (`seed:demo`) refuses to run when `NODE_ENV=production` unless `--force`
  is passed explicitly.

## Reporting a vulnerability

This is a personal project without a dedicated security team. If you find a
vulnerability, please open a private report through GitHub's
["Report a vulnerability"](../../security/advisories/new) flow on this
repository instead of a public issue. Include reproduction steps and the
affected component (`packages/api`, `packages/web`, `packages/shared`, `infra/caddy`).
There is no bug bounty; a fix or an acknowledgement should follow within a
reasonable timeframe on a best-effort basis.
