import { addMonths, buildMonthProjection, monthStart } from "@haven/shared";
import { and, eq, gte, lt } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  bankConnections,
  budgets,
  categories,
  goalContributions,
  goals,
  notifications,
  plannedPurchases,
  recurringEntries,
  transactions,
} from "../db/schema.js";
import { serializePurchase } from "../routes/purchases.js";
import { serializeRecurring } from "../routes/recurring.js";
import { getOrCreateSettings } from "../routes/settings.js";
import type { AlertMessage, OutboundChannel } from "./channel.js";
import { createOutboundChannel } from "./create-channel.js";

function isConnectionError(status: string): boolean {
  const normalized = status.toUpperCase();
  return normalized.includes("ERROR") || normalized === "OUTDATED";
}

async function alreadySent(dedupKey: string): Promise<boolean> {
  const [row] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(eq(notifications.dedupKey, dedupKey));
  return Boolean(row);
}

async function deliver(channel: OutboundChannel, message: AlertMessage): Promise<boolean> {
  if (await alreadySent(message.dedupKey)) return false;
  const ok = await channel.send(message);
  if (!ok) return false;
  await db.insert(notifications).values({
    type: message.type,
    dedupKey: message.dedupKey,
    payload: message,
    channel: channel.name,
  });
  return true;
}

export async function evaluateAlerts(
  channel: OutboundChannel = createOutboundChannel(),
): Promise<number> {
  const settings = await getOrCreateSettings();
  if (!settings.alertsEnabled || channel.name === "none") return 0;

  const month = monthStart(new Date());
  const from = new Date(`${month}T00:00:00.000Z`);
  const to = new Date(`${addMonths(month, 1)}T00:00:00.000Z`);
  let sent = 0;

  const connections = await db.select().from(bankConnections);
  for (const connection of connections) {
    if (!isConnectionError(connection.status)) continue;
    const delivered = await deliver(channel, {
      type: "connection_error",
      dedupKey: `connection:${connection.id}:error`,
      title: "Conexão bancária com erro",
      body: `${connection.institutionName}: ${connection.status}`,
    });
    if (delivered) sent += 1;
  }

  const txs = await db.select().from(transactions);
  for (const tx of txs) {
    if (Math.abs(tx.amountCents) < settings.largeTransactionThresholdCents) continue;
    const delivered = await deliver(channel, {
      type: "large_transaction",
      dedupKey: `tx:${tx.id}`,
      title: "Transação acima do limiar",
      body: `${tx.description}: ${tx.amountCents} cents`,
    });
    if (delivered) sent += 1;
  }

  const [
    recurringRows,
    purchaseRows,
    transactionRows,
    categoryRows,
    budgetRows,
    goalRows,
    contributionRows,
  ] = await Promise.all([
    db.select().from(recurringEntries),
    db.select().from(plannedPurchases).where(eq(plannedPurchases.status, "approved")),
    db.select().from(transactions).where(and(gte(transactions.date, from), lt(transactions.date, to))),
    db.select({ id: categories.id, name: categories.name }).from(categories),
    db
      .select({ categoryId: budgets.categoryId, limitCents: budgets.limitCents })
      .from(budgets)
      .where(eq(budgets.month, month)),
    db.select().from(goals),
    db.select().from(goalContributions),
  ]);

  const projection = buildMonthProjection({
    month,
    recurring: recurringRows.map(serializeRecurring),
    purchases: purchaseRows.map(serializePurchase),
    transactions: transactionRows.map((row) => ({
      id: row.id,
      amountCents: row.amountCents,
      date: row.date.toISOString(),
      customCategoryId: row.customCategoryId,
      pluggyCategory: row.pluggyCategory,
      recurringEntryId: row.recurringEntryId,
      plannedPurchaseId: row.plannedPurchaseId,
    })),
    categories: categoryRows,
    budgets: budgetRows,
    goals: goalRows.map((row) => ({
      id: row.id,
      name: row.name,
      plannedMonthlyCents: row.plannedMonthlyCents,
    })),
    goalContributions: contributionRows.map((row) => ({
      goalId: row.goalId,
      date: row.date,
    })),
  });

  for (const entry of projection.byCategory) {
    if (entry.categoryId === null || entry.budgetUsedPct === null || entry.budgetUsedPct < 100) {
      continue;
    }
    const delivered = await deliver(channel, {
      type: "budget_limit",
      dedupKey: `budget:${entry.categoryId}:${month}`,
      title: "Orçamento estourado",
      body: `${entry.name} em ${month}: ${entry.budgetUsedPct}%`,
    });
    if (delivered) sent += 1;
  }

  return sent;
}
