# Setup

This is the detailed reference for getting Haven running locally. For the
fastest path to a working demo, see the [Quick start](README.md#quick-start-demo-mode-no-accounts-needed)
section of the README instead — this document is for people who want to run
the packages outside Docker, add a migration, or run the test suites.

## Prerequisites

| Tool | Version | Why |
|---|---|---|
| Node.js | >= 22 | runtime for all three packages |
| pnpm | 11.17.0 | workspace package manager (`packageManager` field pins this) |
| Docker + Docker Compose | any recent version | Postgres, the demo stack, and the CI smoke test |

Check what you have:

```bash
node --version
pnpm --version
docker --version
```

## Install

```bash
git clone https://github.com/lucas-lima-s/uniquedev.git
cd uniquedev
pnpm install
cp .env.example .env
```

`pnpm install` resolves the whole workspace (`packages/shared`, `packages/api`,
`packages/web`) in one pass. `pnpm-lock.yaml` is committed; `pnpm install
--frozen-lockfile` is what CI runs, so keep it in sync when you add a
dependency.

## Running a Postgres instance

The dev compose override publishes Postgres on the host so packages running
outside Docker can reach it:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db
```

This starts `db` on `127.0.0.1:55433`, using the `POSTGRES_USER` /
`POSTGRES_PASSWORD` / `POSTGRES_DB` values from `.env` (defaults to
`haven` / `change-me` / `haven`).

## Running the app outside Docker

```bash
pnpm dev:shared   # watches packages/shared, rebuilds dist/ on change
pnpm dev:api      # Fastify on :3000, loads ../../.env
pnpm dev:web      # Vite on :5173, proxies /api to :3000
```

`packages/api` and `packages/web` both import `@haven/shared` from its built
`dist/`, not from source, so `pnpm dev:shared` needs to be running (or you
need a fresh `pnpm --filter @haven/shared build`) before the other two will
pick up changes to the shared package.

For the API to boot outside Docker, `.env` needs at minimum:

```
NODE_ENV=development
AUTH_MODE=dev
DATA_PROVIDER=mock
DATABASE_URL=postgres://haven:change-me@127.0.0.1:55433/haven
WEBHOOK_SECRET=<any string >= 16 chars>
ALERT_CHANNEL=none
```

Outbound alerts default to `ALERT_CHANNEL=none`. Set `webhook` plus
`ALERT_WEBHOOK_URL`, or `telegram` plus `TELEGRAM_BOT_TOKEN` and
`TELEGRAM_CHAT_ID`, in the local environment only. Keep those secrets out of git.

`AUTH_MODE=dev` injects a fixed `dev@haven.local` identity instead of
verifying a proxy JWT, and the app refuses to start with `AUTH_MODE=dev` when
`NODE_ENV=production`.

## Applying migrations and seeding demo data

```bash
pnpm --filter @haven/api build
node packages/api/dist/migrate.js
node packages/api/dist/seed/demo.js
```

The seed script is idempotent — running it again reproduces the same rows
and the same `/api/dashboard` output, which is what licenses the screenshots
committed under `docs/screenshots/`.

## Running the tests

```bash
pnpm --filter @haven/shared test              # pure unit tests, no dependencies
pnpm --filter @haven/shared test -- --coverage
pnpm --filter @haven/web test                 # smoke suite, stubbed fetch

# packages/api needs a real Postgres reachable at TEST_DATABASE_URL
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db
TEST_DATABASE_URL=postgres://haven:change-me@127.0.0.1:55433/haven_test \
  pnpm --filter @haven/api test
```

`packages/api/test/global-setup.ts` creates `haven_test` if it does not
exist yet and runs the Drizzle migrator against it before the suite starts.

## Adding a database migration

Schema changes live in `packages/api/src/db/schema.ts`. After editing it:

```bash
pnpm --filter @haven/api exec drizzle-kit generate
```

This writes a new `packages/api/drizzle/NNNN_*.sql` file plus its matching
`packages/api/drizzle/meta/*.json` snapshot. Both are generated output —
commit them as drizzle-kit writes them rather than hand-editing, and never
renumber or delete an already-committed migration.

## Linting and formatting

Biome covers both in one command:

```bash
pnpm lint             # biome ci . — fails on any lint or format drift
pnpm format           # biome format --write . — fixes formatting in place
```

## Troubleshooting

- **API fails to start with a Zod error naming `PLUGGY_CLIENT_ID` /
  `PLUGGY_CLIENT_SECRET`:** you set `DATA_PROVIDER=pluggy` without providing
  credentials. Switch back to `DATA_PROVIDER=mock` for local work, or fill in
  both Pluggy variables.
- **`pnpm --filter @haven/api test` hangs or times out:** `db` from
  `docker-compose.dev.yml` isn't running, or `TEST_DATABASE_URL` doesn't
  match the port it published (`55433` by default).
- **Web app shows stale behaviour after editing `packages/shared`:** rebuild
  it (`pnpm --filter @haven/shared build`) or keep `pnpm dev:shared` running;
  the other packages consume its compiled `dist/`, not its `src/`.
