import { monthStart } from "@haven/shared";
import { describe, expect, it } from "vitest";
import type { AlertMessage, OutboundChannel } from "../src/alerts/channel.js";
import { evaluateAlerts } from "../src/alerts/evaluate.js";
import { db } from "../src/db/client.js";
import { accounts, bankConnections, transactions } from "../src/db/schema.js";
import { buildTestApp } from "./helpers/build.js";

function memoryChannel(): OutboundChannel & { messages: AlertMessage[] } {
  const messages: AlertMessage[] = [];
  return {
    name: "webhook",
    messages,
    async send(message) {
      messages.push(message);
      return true;
    },
  };
}

describe("outbound alerts", () => {
  it("sends each trigger once", async () => {
    const app = buildTestApp();
    await app.inject({
      method: "PATCH",
      url: "/settings",
      payload: { alertsEnabled: true, largeTransactionThresholdCents: 4000 },
    });
    const category = await app.inject({
      method: "POST",
      url: "/categories",
      payload: { name: "Mercado" },
    });
    const categoryId = category.json().id as string;
    const month = monthStart(new Date());
    await app.inject({
      method: "PUT",
      url: "/budgets",
      payload: { categoryId, month, limitCents: 1000 },
    });

    const [connection] = await db
      .insert(bankConnections)
      .values({
        pluggyItemId: "alert-conn",
        institutionName: "Banco",
        status: "LOGIN_ERROR",
      })
      .returning();
    const [account] = await db
      .insert(accounts)
      .values({
        connectionId: connection!.id,
        pluggyAccountId: "alert-acc",
        name: "Conta",
        type: "checking",
        balanceCents: 0,
      })
      .returning();
    await db.insert(transactions).values({
      accountId: account!.id,
      pluggyTransactionId: "alert-tx",
      description: "Compra grande",
      amountCents: -5000,
      date: new Date(),
      customCategoryId: categoryId,
    });

    const channel = memoryChannel();
    const first = await evaluateAlerts(channel);
    const second = await evaluateAlerts(channel);
    expect(first).toBeGreaterThanOrEqual(3);
    expect(second).toBe(0);
    expect(channel.messages.map((message) => message.type).sort()).toEqual([
      "budget_limit",
      "connection_error",
      "large_transaction",
    ]);
  });
});
