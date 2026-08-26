import { describe, expect, it } from "vitest";
import { db } from "../src/db/client.js";
import { accounts, bankConnections, transactions } from "../src/db/schema.js";
import { buildTestApp } from "./helpers/build.js";

async function seedAccountWithTransaction() {
  const [connection] = await db
    .insert(bankConnections)
    .values({ pluggyItemId: "conn-1", institutionName: "Banco Aurora", status: "UPDATED" })
    .returning({ id: bankConnections.id });
  const [account] = await db
    .insert(accounts)
    .values({
      connectionId: connection!.id,
      pluggyAccountId: "acc-1",
      name: "Conta",
      type: "checking",
      balanceCents: 1000,
    })
    .returning({ id: accounts.id });
  const [tx] = await db
    .insert(transactions)
    .values({
      accountId: account!.id,
      pluggyTransactionId: "tx-1",
      description: "Mercado",
      amountCents: -5000,
      date: new Date("2026-08-10T12:00:00Z"),
    })
    .returning({ id: transactions.id });
  return { accountId: account!.id, transactionId: tx!.id };
}

describe("transactions", () => {
  it("filters by accountId", async () => {
    const { accountId } = await seedAccountWithTransaction();
    const app = buildTestApp();
    const response = await app.inject({
      method: "GET",
      url: `/transactions?accountId=${accountId}`,
    });
    expect(response.json()).toHaveLength(1);
  });

  it("filters by a from/to date range", async () => {
    await seedAccountWithTransaction();
    const app = buildTestApp();

    const inRange = await app.inject({
      method: "GET",
      url: "/transactions?from=2026-08-01T00:00:00.000Z&to=2026-08-31T00:00:00.000Z",
    });
    expect(inRange.json()).toHaveLength(1);

    const outOfRange = await app.inject({
      method: "GET",
      url: "/transactions?from=2026-09-01T00:00:00.000Z&to=2026-09-30T00:00:00.000Z",
    });
    expect(outOfRange.json()).toHaveLength(0);
  });

  it("patches the custom category", async () => {
    const { transactionId } = await seedAccountWithTransaction();
    const app = buildTestApp();
    const category = await app.inject({
      method: "POST",
      url: "/categories",
      payload: { name: "Mercado" },
    });
    const { id: categoryId } = category.json();

    const patched = await app.inject({
      method: "PATCH",
      url: `/transactions/${transactionId}/category`,
      payload: { customCategoryId: categoryId },
    });
    expect(patched.json().customCategoryId).toBe(categoryId);
  });

  it("links a transaction to a recurring entry", async () => {
    const { transactionId } = await seedAccountWithTransaction();
    const app = buildTestApp();
    const recurring = await app.inject({
      method: "POST",
      url: "/recurring",
      payload: {
        kind: "expense",
        name: "Mercado",
        amountCents: 5000,
        cadence: "monthly",
        dueDay: 10,
        activeFrom: "2026-01-01",
      },
    });
    const { id: recurringEntryId } = recurring.json();

    const linked = await app.inject({
      method: "PATCH",
      url: `/transactions/${transactionId}/link`,
      payload: { recurringEntryId },
    });
    expect(linked.json().recurringEntryId).toBe(recurringEntryId);
  });
});
