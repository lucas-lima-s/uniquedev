import { describe, expect, it } from "vitest";
import type { PlannedPurchase } from "../schemas/planned-purchase.js";
import type { RecurringEntry } from "../schemas/recurring-entry.js";
import { buildMonthProjection, type ProjectionTransaction } from "./build-month.js";

const salary: RecurringEntry = {
  id: "11111111-1111-4111-8111-111111111111",
  kind: "income",
  name: "Salário",
  amountCents: 1000000,
  cadence: "monthly",
  dueDay: 5,
  dueMonth: null,
  categoryId: null,
  activeFrom: "2026-01-01",
  activeUntil: null,
  matchPattern: null,
};

const rent: RecurringEntry = {
  ...salary,
  id: "22222222-2222-4222-8222-222222222222",
  kind: "expense",
  name: "Aluguel",
  amountCents: 250000,
  dueDay: 10,
  categoryId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
};

const insurance: RecurringEntry = {
  ...salary,
  id: "33333333-3333-4333-8333-333333333333",
  kind: "expense",
  name: "Seguro do carro",
  amountCents: 120000,
  cadence: "yearly",
  dueDay: 15,
  dueMonth: 3,
};

const tv: PlannedPurchase = {
  id: "44444444-4444-4444-8444-444444444444",
  name: "TV",
  totalCents: 300000,
  plannedDate: "2026-07-20",
  paymentMode: "installments",
  installmentsCount: 3,
  status: "approved",
  categoryId: null,
  notes: null,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};

function tx(
  partial: Partial<ProjectionTransaction> & { amountCents: number; date: string },
): ProjectionTransaction {
  return {
    id: crypto.randomUUID(),
    customCategoryId: null,
    pluggyCategory: null,
    recurringEntryId: null,
    plannedPurchaseId: null,
    ...partial,
  };
}

describe("buildMonthProjection", () => {
  it("projects income, realized spend, open commitments and what remains", () => {
    const projection = buildMonthProjection({
      month: "2026-08-01",
      recurring: [salary, rent, insurance],
      purchases: [tv],
      transactions: [
        tx({
          amountCents: -15000,
          date: "2026-08-03T12:00:00.000Z",
          pluggyCategory: "Alimentação",
        }),
        tx({ amountCents: -5000, date: "2026-08-04T12:00:00.000Z", pluggyCategory: "Alimentação" }),
        tx({ amountCents: 1000000, date: "2026-08-05T12:00:00.000Z", recurringEntryId: salary.id }),
        tx({ amountCents: -9999, date: "2026-07-30T12:00:00.000Z" }),
      ],
      categories: [{ id: rent.categoryId!, name: "Moradia" }],
      budgets: [],
    });

    expect(projection.incomeCents).toBe(1000000);
    expect(projection.realizedIncomeCents).toBe(1000000);
    expect(projection.spentCents).toBe(20000);
    expect(
      projection.committed.map((line) => [
        line.name,
        line.amountCents,
        line.installmentLabel,
        line.dueDate,
      ]),
    ).toEqual([
      ["Aluguel", 250000, null, "2026-08-10"],
      ["TV", 100000, "2/3", "2026-08-20"],
      ["Seguro do carro", 10000, null, "2027-03-15"],
    ]);
    expect(projection.committed[2]?.provision).toBe(true);
    expect(projection.committedCents).toBe(360000);
    expect(projection.remainingCents).toBe(1000000 - 20000 - 360000);
    expect(projection.spentShare.pct).toBe(2);
    expect(projection.committedShare.pct).toBe(36);
    expect(projection.remainingShare.pct).toBe(62);
  });

  it("drops a commitment once a transaction in the month is linked to it", () => {
    const projection = buildMonthProjection({
      month: "2026-08-01",
      recurring: [salary, rent],
      purchases: [tv],
      transactions: [
        tx({ amountCents: -250000, date: "2026-08-10T12:00:00.000Z", recurringEntryId: rent.id }),
        tx({ amountCents: -100000, date: "2026-08-20T12:00:00.000Z", plannedPurchaseId: tv.id }),
      ],
      categories: [],
      budgets: [],
    });

    expect(projection.committed).toEqual([]);
    expect(projection.spentCents).toBe(350000);
    expect(projection.remainingCents).toBe(650000);
  });

  it("ignores draft and cancelled purchases and installments outside the month", () => {
    const projection = buildMonthProjection({
      month: "2026-10-01",
      recurring: [],
      purchases: [tv, { ...tv, id: "55555555-5555-4555-8555-555555555555", status: "draft" }],
      transactions: [],
      categories: [],
      budgets: [],
    });
    expect(projection.committed).toEqual([]);
  });

  it("breaks spend down by category with shares and budget usage", () => {
    const food = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const projection = buildMonthProjection({
      month: "2026-08-01",
      recurring: [salary],
      purchases: [],
      transactions: [
        tx({ amountCents: -30000, date: "2026-08-03T12:00:00.000Z", customCategoryId: food }),
        tx({ amountCents: -10000, date: "2026-08-04T12:00:00.000Z", pluggyCategory: "Transporte" }),
        tx({ amountCents: -10000, date: "2026-08-05T12:00:00.000Z" }),
      ],
      categories: [{ id: food, name: "Alimentação" }],
      budgets: [{ categoryId: food, limitCents: 60000 }],
    });

    expect(projection.byCategory).toEqual([
      {
        categoryId: food,
        name: "Alimentação",
        spent: { cents: 30000, pct: 60 },
        budgetCents: 60000,
        budgetUsedPct: 50,
      },
      {
        categoryId: null,
        name: "Transporte",
        spent: { cents: 10000, pct: 20 },
        budgetCents: null,
        budgetUsedPct: null,
      },
      {
        categoryId: null,
        name: "Sem categoria",
        spent: { cents: 10000, pct: 20 },
        budgetCents: null,
        budgetUsedPct: null,
      },
    ]);
  });

  it("reports zero shares when there is no projected income", () => {
    const projection = buildMonthProjection({
      month: "2026-08-01",
      recurring: [],
      purchases: [],
      transactions: [tx({ amountCents: -100, date: "2026-08-01T12:00:00.000Z" })],
      categories: [],
      budgets: [],
    });
    expect(projection.spentShare).toEqual({ cents: 100, pct: 0 });
    expect(projection.remainingCents).toBe(-100);
  });

  it("goes negative when committed spend exceeds income", () => {
    const projection = buildMonthProjection({
      month: "2026-08-01",
      recurring: [salary, { ...rent, amountCents: 1200000 }],
      purchases: [],
      transactions: [],
      categories: [],
      budgets: [],
    });
    expect(projection.incomeCents).toBe(1000000);
    expect(projection.committedCents).toBe(1200000);
    expect(projection.remainingCents).toBe(1000000 - 1200000);
    expect(projection.remainingCents).toBeLessThan(0);
  });
});
