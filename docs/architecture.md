# Architecture

## Repository layout

This is a pnpm monorepo with three top-level directories:

| Path | What |
|---|---|
| `portfolio/` | A static hub page served at the domain root, linking out to the other public repositories. |
| `haven/api` | `@uniquedev/haven-api` — Fastify 5 API: identity verification, provider sync, CRUD routes, webhook ingestion, two scheduled jobs. |
| `haven/web` | `@uniquedev/haven-web` — Vite + React 19 SPA, served as static files by Caddy at `/haven/`. |
| `haven/shared` | `@uniquedev/haven-shared` — Zod schemas, money helpers and the projection engine, imported by both `api` and `web`. |
| `infra/caddy` | Caddyfile and the image that bundles the portfolio hub with each app's web build. |

## Money convention

Every monetary value is stored and passed around as an **integer number of
cents** (`*Cents` fields, `bigint` columns in Postgres). Nothing in the
codebase parses or stores a float for money — `money.ts` in `haven/shared`
is the only place that converts between a decimal (reais) input and integer
cents (`reaisToCents`), and it rounds explicitly instead of relying on
float arithmetic.

## Provider abstraction

`haven/api/src/providers/` defines a single interface, `BankDataProvider`,
with two implementations:

- `pluggy.ts` wraps the Pluggy SDK (`pluggy-sdk`) for real Open Finance
  Brasil connections. The client is instantiated lazily so importing the
  module without credentials cannot throw.
- `mock.ts` is a deterministic, seeded dataset (fixed seed, a small linear
  congruential generator in `lib/deterministic-rng.ts`) with two fictional
  institutions, four accounts, roughly 180 transactions across three months
  and five investments. It never depends on the network.

`providers/index.ts` picks one at import time based on `DATA_PROVIDER`
(`pluggy` or `mock`). Every route and job downstream — sync, webhooks,
connections, the demo seed — talks only to the `BankDataProvider` interface,
so the whole application runs with zero third-party accounts when
`DATA_PROVIDER=mock`.

## Sync algorithm

`haven/api/src/sync/sync-item.ts` (`syncItem`) is the single sync path, used
by manual "sync now" requests, the webhook handler and the reconciliation
cron alike:

1. Fetch the item (institution/status) from the active provider.
2. Look up the existing `bank_connections` row (if any) to compute a resync
   window: `lastSyncedAt - 45 days`, so a delayed webhook or a reconnect
   still recovers any transaction the previous sync might have missed.
3. Upsert the connection, then each account, then each transaction —
   everything keyed by the **provider-native id**
   (`pluggy_item_id` / `pluggy_account_id` / `pluggy_transaction_id`) via
   `onConflictDoUpdate`, so re-running a sync is idempotent.
4. Sync investments the same way, keyed by `pluggy_investment_id`, then
   write an investment snapshot if any investment came back.
5. Only after every account and transaction is written does the connection's
   `lastSyncedAt` get set — to the sync's **start** time, not its end, so a
   sync that is interrupted partway still resyncs the gap on the next run
   instead of silently skipping it.

`pluggy_*` column and field names are kept even though the provider is now
abstracted: they mean "the provider-native id/category", not literally
Pluggy. Renaming them would force rewriting three migrations and their
Drizzle snapshots for no functional gain.

## Webhook lifecycle

`POST /webhooks` accepts the shared secret from either the
`x-webhook-secret` header or a `?token=` query parameter (compared with
`crypto.timingSafeEqual` against both), because a webhook delivery is not
guaranteed to carry a custom header, and the delivery URL is already
configurable. Every accepted request is persisted to `webhook_events` with
status `pending`, replies `200` immediately, and only then triggers
`syncItem` for the referenced item — the response never waits on the sync.
The row is updated to `processed` or `error` once the sync settles, so a
stuck or failed sync is visible without ever leaving the caller hanging.

## Month projection

`haven/shared/src/projection/` is a pure, framework-free package that turns
recurring entries, planned purchases, and realized transactions for a given
month into a single `buildMonthProjection` result: projected income, realized
spend, open commitments (recurring bills, yearly provisions taken as a
monthly twelfth, and approved-purchase installments due that month), what
remains, and a spend breakdown by category with budget usage. It is unit
tested in isolation (`packages: haven/shared`) and reused verbatim by both
the API's `/dashboard` route and the web dashboard — there is exactly one
implementation of "what does this month look like".

## Scheduled jobs

Two `croner` jobs run inside the API process, both scoped to
`APP_TIMEZONE`:

- **Reconciliation** (`RECONCILE_CRON`, default every 4 hours) re-syncs
  every known connection, catching any webhook that never arrived.
- **Investment snapshot** (`SNAPSHOT_CRON`, default daily at 06:00) writes
  one row per investment asset for the current day, upserted by
  `(assetId, snapshotDate)` so re-running it the same day never duplicates.

Both jobs are stopped, and the Postgres pool closed, from an `onClose` hook
wired to `SIGTERM`/`SIGINT` — a container restart does not leak connections.

## Identity

There is no in-app user table: identity is delegated to whatever
identity-aware proxy sits in front of the API (Cloudflare Access,
oauth2-proxy, Pomerium, ...). `AUTH_MODE=proxy` verifies a JWT read from
`AUTH_IDENTITY_HEADER` against `AUTH_JWKS_URL`/`AUTH_ISSUER`/`AUTH_AUDIENCE`
using `jose`; `AUTH_MODE=dev` injects a fixed local identity and is refused
outright whenever `NODE_ENV=production`. This is a deliberate single-tenant
design — the app has exactly one owner.

## Migrations

Migrations (`haven/api/drizzle/*.sql`, managed by `drizzle-kit`) are never
run automatically at container boot. They are an explicit, manual step
(`node dist/migrate.js`) run once per deploy — see `deployment.md`.
