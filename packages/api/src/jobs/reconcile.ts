import { Cron } from "croner";
import type { FastifyBaseLogger } from "fastify";
import { db } from "../db/client.js";
import { bankConnections } from "../db/schema.js";
import { env } from "../env.js";
import { syncItem } from "../sync/sync-item.js";

export async function reconcileAllConnections(log: FastifyBaseLogger) {
  const connections = await db.select().from(bankConnections);
  for (const connection of connections) {
    try {
      await syncItem(connection.pluggyItemId);
    } catch (error) {
      log.error({ err: error, itemId: connection.pluggyItemId }, "reconciliation failed");
    }
  }
}

export function startReconciliationJob(log: FastifyBaseLogger) {
  return new Cron(env.RECONCILE_CRON, { timezone: env.APP_TIMEZONE, protect: true }, () =>
    reconcileAllConnections(log),
  );
}
