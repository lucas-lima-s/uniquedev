import { describe, expect, it } from "vitest";
import type { RecurringEntry } from "../schemas/recurring-entry.js";
import {
  expandRecurring,
  isActiveIn,
  monthlyEquivalentCents,
  yearlyEquivalentCents,
} from "./recurring.js";

const base: RecurringEntry = {
  id: "0d9f1c1e-1c5e-4f9b-9a1b-0f4c2f6a1a01",
  kind: "expense",
  name: "Aluguel",
  amountCents: 250000,
  cadence: "monthly",
  dueDay: 10,
  dueMonth: null,
  categoryId: null,
  activeFrom: "2026-01-01",
  activeUntil: null,
  matchPattern: null,
};

describe("recurring projection", () => {
  it("computes monthly and yearly equivalents", () => {
    expect(monthlyEquivalentCents({ cadence: "monthly", amountCents: 1000 })).toBe(1000);
    expect(yearlyEquivalentCents({ cadence: "monthly", amountCents: 1000 })).toBe(12000);
    expect(monthlyEquivalentCents({ cadence: "yearly", amountCents: 120000 })).toBe(10000);
    expect(monthlyEquivalentCents({ cadence: "yearly", amountCents: 100 })).toBe(8);
    expect(yearlyEquivalentCents({ cadence: "yearly", amountCents: 120000 })).toBe(120000);
  });

  it("respects the active window", () => {
    expect(isActiveIn({ activeFrom: "2026-03-15", activeUntil: null }, "2026-03-01")).toBe(true);
    expect(isActiveIn({ activeFrom: "2026-04-01", activeUntil: null }, "2026-03-01")).toBe(false);
    expect(isActiveIn({ activeFrom: "2026-01-01", activeUntil: "2026-02-28" }, "2026-03-01")).toBe(
      false,
    );
    expect(isActiveIn({ activeFrom: "2026-01-01", activeUntil: "2026-03-01" }, "2026-03-01")).toBe(
      true,
    );
  });

  it("expands a monthly entry with the due day clamped into the month", () => {
    const [line] = expandRecurring([{ ...base, dueDay: 31 }], "2026-02-01");
    expect(line).toMatchObject({
      entryId: base.id,
      amountCents: 250000,
      dueDate: "2026-02-28",
      provision: false,
    });
  });

  it("expands a yearly entry as a twelfth provision pointing at the next due date", () => {
    const ipva: RecurringEntry = {
      ...base,
      id: "2c7a6a4e-3f3f-4b1c-8f2f-6a0c2b7f1b02",
      name: "IPVA",
      amountCents: 240000,
      cadence: "yearly",
      dueDay: 20,
      dueMonth: 1,
    };
    expect(expandRecurring([ipva], "2026-08-01")[0]).toMatchObject({
      amountCents: 20000,
      dueDate: "2027-01-20",
      provision: true,
    });
    expect(expandRecurring([ipva], "2026-01-01")[0]?.dueDate).toBe("2026-01-20");
  });

  it("drops inactive entries", () => {
    expect(expandRecurring([{ ...base, activeUntil: "2026-05-31" }], "2026-08-01")).toEqual([]);
  });
});
