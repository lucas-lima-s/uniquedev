import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgres://haven:haven@127.0.0.1:55433/haven_test";

function splitDatabaseUrl(url: string): { adminUrl: string; databaseName: string } {
  const parsed = new URL(url);
  const databaseName = parsed.pathname.replace(/^\//, "");
  const adminUrl = new URL(url);
  adminUrl.pathname = "/postgres";
  return { adminUrl: adminUrl.toString(), databaseName };
}

async function ensureDatabaseExists(): Promise<void> {
  const { adminUrl, databaseName } = splitDatabaseUrl(TEST_DATABASE_URL);
  const admin = postgres(adminUrl, { max: 1 });
  try {
    const existing = await admin`SELECT 1 FROM pg_database WHERE datname = ${databaseName}`;
    if (existing.length === 0) {
      await admin.unsafe(`CREATE DATABASE "${databaseName}"`);
    }
  } finally {
    await admin.end();
  }
}

export default async function globalSetup(): Promise<void> {
  await ensureDatabaseExists();

  const client = postgres(TEST_DATABASE_URL, { max: 1 });
  try {
    await migrate(drizzle({ client }), { migrationsFolder: "drizzle" });
  } finally {
    await client.end();
  }
}
