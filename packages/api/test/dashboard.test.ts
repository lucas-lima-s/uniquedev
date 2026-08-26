import { describe, expect, it } from "vitest";
import { db } from "../src/db/client.js";
import {
  accounts,
  bankConnections,
  categories,
  recurringEntries,
  transactions,
} from "../src/db/schema.js";
import { buildTestApp } from "./helpers/build.js";

describe("GET /dashboard", () => {
  it("computes exact totals for a fixed seeded scenario", async () => {
    const [connection] = await db
      .insert(bankConnections)
      .values({ pluggyItemId: "conn-1", institutionName: "Banco Aurora", status: "UPDATED" })
      .returning({ id: bankConnections.id });
    const [checking] = await db
      .insert(accounts)
      .values({
        connectionId: connection!.id,
        pluggyAccountId: "acc-checking",
        name: "Conta",
        type: "checking",
        balanceCents: 500000,
      })
      .returning({ id: accounts.id });
    await db.insert(accounts).values({
      connectionId: connection!.id,
      pluggyAccountId: "acc-cc",
      name: "Cartão",
      type: "credit_card",
      balanceCents: -120000,
    });
    const [category] = await db.insert(categories).values({ name: "Mercado" }).returning({
      id: categories.id,
    });

    await db.insert(recurringEntries).values({
      kind: "income",
      name: "Salário",
      amountCents: 1000000,
      cadence: "monthly",
      dueDay: 5,
      activeFrom: "2026-01-01",
    });
    await db.insert(recurringEntries).values({
      kind: "expense",
      name: "Aluguel",
      amountCents: 250000,
      cadence: "monthly",
      dueDay: 10,
      activeFrom: "2026-01-01",
    });

    await db.insert(transactions).values([
      {
        accountId: checking!.id,
        pluggyTransactionId: "tx-1",
        description: "Mercado",
        amountCents: -30000,
        date: new Date("2026-08-05T12:00:00Z"),
        customCategoryId: category!.id,
      },
      {
        accountId: checking!.id,
        pluggyTransactionId: "tx-2",
        description: "Farmácia",
        amountCents: -10000,
        date: new Date("2026-08-06T12:00:00Z"),
      },
    ]);

    const app = buildTestApp();
    const response = await app.inject({ method: "GET", url: "/dashboard?month=2026-08-01" });
    const body = response.json();

    expect(body.incomeCents).toBe(1000000);
    expect(body.spentCents).toBe(40000);
    expect(body.committedCents).toBe(250000);
    expect(body.remainingCents).toBe(1000000 - 40000 - 250000);
    expect(body.byCategory[0].name).toBe("Mercado");
    expect(body.accountsTotalCents).toBe(500000);
    expect(body.creditCardDebtCents).toBe(120000);
  });
});
