import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "../src/db/client.js";
import { accounts, bankConnections, transactions } from "../src/db/schema.js";
import { buildTestApp } from "./helpers/build.js";

async function seedAccount() {
  const [connection] = await db
    .insert(bankConnections)
    .values({ pluggyItemId: "conn-rules", institutionName: "Banco Aurora", status: "UPDATED" })
    .returning({ id: bankConnections.id });
  const [account] = await db
    .insert(accounts)
    .values({
      connectionId: connection!.id,
      pluggyAccountId: "acc-rules",
      name: "Conta",
      type: "checking",
      balanceCents: 1000,
    })
    .returning({ id: accounts.id });
  return account!.id;
}

async function insertTx(
  accountId: string,
  input: { pluggyId: string; description: string; amountCents?: number; date?: string },
) {
  const [tx] = await db
    .insert(transactions)
    .values({
      accountId,
      pluggyTransactionId: input.pluggyId,
      description: input.description,
      amountCents: input.amountCents ?? -5590,
      date: new Date(input.date ?? "2026-08-05T12:00:00Z"),
    })
    .returning({ id: transactions.id });
  return tx!.id;
}

describe("learned category rules and recurring detection", () => {
  it("learns a rule on recategorize and fills uncategorized matches", async () => {
    const accountId = await seedAccount();
    const firstId = await insertTx(accountId, { pluggyId: "tx-n1", description: "Netflix" });
    const secondId = await insertTx(accountId, { pluggyId: "tx-n2", description: "NETFLIX" });
    const app = buildTestApp();
    const category = await app.inject({
      method: "POST",
      url: "/categories",
      payload: { name: "Streaming" },
    });
    const { id: categoryId } = category.json();

    await app.inject({
      method: "PATCH",
      url: `/transactions/${firstId}/category`,
      payload: { customCategoryId: categoryId },
    });

    const listed = await app.inject({ method: "GET", url: "/transactions" });
    const rows = listed.json() as { id: string; customCategoryId: string | null }[];
    expect(rows.find((row) => row.id === firstId)?.customCategoryId).toBe(categoryId);
    expect(rows.find((row) => row.id === secondId)?.customCategoryId).toBe(categoryId);
  });

  it("does not overwrite an existing custom category", async () => {
    const accountId = await seedAccount();
    const app = buildTestApp();
    const streaming = await app.inject({
      method: "POST",
      url: "/categories",
      payload: { name: "Streaming" },
    });
    const other = await app.inject({
      method: "POST",
      url: "/categories",
      payload: { name: "Outros" },
    });
    const streamingId = streaming.json().id as string;
    const otherId = other.json().id as string;

    const firstId = await insertTx(accountId, { pluggyId: "tx-keep-1", description: "Spotify" });
    const secondId = await insertTx(accountId, { pluggyId: "tx-keep-2", description: "Spotify" });
    await db
      .update(transactions)
      .set({ customCategoryId: otherId })
      .where(eq(transactions.id, secondId));

    await app.inject({
      method: "PATCH",
      url: `/transactions/${firstId}/category`,
      payload: { customCategoryId: streamingId },
    });

    const listed = await app.inject({ method: "GET", url: "/transactions" });
    const rows = listed.json() as { id: string; customCategoryId: string | null }[];
    expect(rows.find((row) => row.id === secondId)?.customCategoryId).toBe(otherId);
  });

  it("auto-links transactions when a recurring matchPattern is saved", async () => {
    const accountId = await seedAccount();
    const txId = await insertTx(accountId, { pluggyId: "tx-rent", description: "Aluguel apto 12" });
    const app = buildTestApp();
    const created = await app.inject({
      method: "POST",
      url: "/recurring",
      payload: {
        kind: "expense",
        name: "Aluguel",
        amountCents: 200000,
        cadence: "monthly",
        dueDay: 10,
        activeFrom: "2026-01-01",
        matchPattern: "aluguel",
      },
    });
    expect(created.statusCode).toBe(201);

    const listed = await app.inject({ method: "GET", url: "/transactions" });
    const rows = listed.json() as { id: string; recurringEntryId: string | null }[];
    expect(rows.find((row) => row.id === txId)?.recurringEntryId).toBe(created.json().id);
  });

  it("suggests unregistered monthly expenses from history", async () => {
    const accountId = await seedAccount();
    await insertTx(accountId, {
      pluggyId: "sug-1",
      description: "Academia",
      amountCents: -9900,
      date: "2026-06-08T12:00:00Z",
    });
    await insertTx(accountId, {
      pluggyId: "sug-2",
      description: "Academia",
      amountCents: -9900,
      date: "2026-07-08T12:00:00Z",
    });
    await insertTx(accountId, {
      pluggyId: "sug-3",
      description: "Academia",
      amountCents: -9900,
      date: "2026-08-08T12:00:00Z",
    });
    const app = buildTestApp();
    const response = await app.inject({ method: "GET", url: "/recurring/suggestions" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([
      expect.objectContaining({
        matchPattern: "academia",
        dueDay: 8,
        occurrenceCount: 3,
      }),
    ]);
  });
});
