import { describe, expect, it } from "vitest";
import { emergencyFundTargetCents, goalProgressCents } from "./goals.js";
import type { RecurringEntry } from "./schemas/recurring-entry.js";

const rent: RecurringEntry = {
  id: "22222222-2222-4222-8222-222222222222",
  kind: "expense",
  name: "Aluguel",
  amountCents: 200000,
  cadence: "monthly",
  dueDay: 10,
  dueMonth: null,
  categoryId: null,
  activeFrom: "2026-01-01",
  activeUntil: null,
  matchPattern: null,
};

const salary: RecurringEntry = {
  ...rent,
  id: "11111111-1111-4111-8111-111111111111",
  kind: "income",
  name: "Salário",
  amountCents: 1000000,
};

describe("emergencyFundTargetCents", () => {
  it("multiplies months by the monthly equivalent of recurring expenses", () => {
    expect(emergencyFundTargetCents(6, [salary, rent], "2026-08-01")).toBe(1200000);
  });
});

describe("goalProgressCents", () => {
  it("uses the linked account balance for an emergency fund", () => {
    expect(
      goalProgressCents({
        kind: "emergency_fund",
        accountBalanceCents: 500000,
        contributionCents: 100,
      }),
    ).toBe(500000);
  });

  it("sums contributions when no account is linked", () => {
    expect(
      goalProgressCents({
        kind: "goal",
        accountBalanceCents: null,
        contributionCents: 25000,
      }),
    ).toBe(25000);
  });
});
