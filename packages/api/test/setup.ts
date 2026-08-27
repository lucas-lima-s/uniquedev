import { afterAll, beforeEach } from "vitest";

process.env.NODE_ENV = "test";
process.env.AUTH_MODE = "dev";
process.env.DATA_PROVIDER = "mock";
process.env.WEBHOOK_SECRET = "test-secret-0123456789"; // repo-audit: allow-secret
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgres://haven:haven@127.0.0.1:55433/haven_test";

const { sql } = await import("../src/db/client.js");

const TABLES = [
  "bank_connections",
  "accounts",
  "transactions",
  "categories",
  "budgets",
  "recurring_entries",
  "planned_purchases",
  "investment_assets",
  "investment_snapshots",
  "webhook_events",
  "category_rules",
  "settings",
  "goals",
  "goal_contributions",
  "notifications",
];

beforeEach(async () => {
  await sql.unsafe(`TRUNCATE ${TABLES.join(", ")} RESTART IDENTITY CASCADE`);
});

afterAll(async () => {
  await sql.end();
});
