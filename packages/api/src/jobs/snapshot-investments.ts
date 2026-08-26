import { Cron } from "croner";
import { sql } from "drizzle-orm";
import type { FastifyBaseLogger } from "fastify";
import { db } from "../db/client.js";
import { investmentAssets, investmentSnapshots } from "../db/schema.js";
import { env } from "../env.js";

function appTimezoneDate(): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: env.APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function todayInAppTimezone(now = new Date()): string {
  return appTimezoneDate().format(now);
}

export async function snapshotInvestments(snapshotDate = todayInAppTimezone()): Promise<number> {
  const assets = await db
    .select({
      id: investmentAssets.id,
      valueCents: investmentAssets.currentValueCents,
      investedCents: investmentAssets.investedCents,
    })
    .from(investmentAssets);
  if (assets.length === 0) return 0;

  await db
    .insert(investmentSnapshots)
    .values(
      assets.map((asset) => ({
        assetId: asset.id,
        snapshotDate,
        valueCents: asset.valueCents,
        investedCents: asset.investedCents,
      })),
    )
    .onConflictDoUpdate({
      target: [investmentSnapshots.assetId, investmentSnapshots.snapshotDate],
      set: {
        valueCents: sql`excluded.value_cents`,
        investedCents: sql`excluded.invested_cents`,
      },
    });
  return assets.length;
}

export function startInvestmentSnapshotJob(log: FastifyBaseLogger) {
  return new Cron(env.SNAPSHOT_CRON, { timezone: env.APP_TIMEZONE, protect: true }, async () => {
    try {
      const count = await snapshotInvestments();
      log.info({ count }, "investment snapshot written");
    } catch (error) {
      log.error({ err: error }, "investment snapshot failed");
    }
  });
}
