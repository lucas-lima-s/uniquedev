import { describe, expect, it } from "vitest";
import { expandPlannedPurchase } from "./purchase.js";

const base = {
  id: "5e1f0b4c-8d6a-4d6e-9c2a-7b1e3f9a2c03",
  name: "Notebook",
  categoryId: null,
  totalCents: 100000,
  plannedDate: "2026-11-30",
  paymentMode: "cash" as const,
  installmentsCount: null,
};

describe("planned purchase projection", () => {
  it("expands a cash purchase into a single line on the planned date", () => {
    expect(expandPlannedPurchase(base)).toEqual([
      expect.objectContaining({
        installmentNumber: 1,
        installmentTotal: 1,
        dueDate: "2026-11-30",
        amountCents: 100000,
      }),
    ]);
  });

  it("splits installments monthly, clamps the day and puts the rounding remainder on the last one", () => {
    const lines = expandPlannedPurchase({
      ...base,
      totalCents: 100000,
      paymentMode: "installments",
      installmentsCount: 3,
    });
    expect(lines.map((l) => l.amountCents)).toEqual([33333, 33333, 33334]);
    expect(lines.map((l) => l.dueDate)).toEqual(["2026-11-30", "2026-12-30", "2027-01-30"]);
    expect(lines.reduce((sum, l) => sum + l.amountCents, 0)).toBe(100000);
  });

  it("clamps into February when the planned day does not exist there", () => {
    const lines = expandPlannedPurchase({
      ...base,
      plannedDate: "2026-12-31",
      paymentMode: "installments",
      installmentsCount: 3,
    });
    expect(lines.map((l) => l.dueDate)).toEqual(["2026-12-31", "2027-01-31", "2027-02-28"]);
  });

  it("clamps a 31st planned date into a 30-day month", () => {
    const lines = expandPlannedPurchase({
      ...base,
      plannedDate: "2026-08-31",
      paymentMode: "installments",
      installmentsCount: 2,
    });
    expect(lines.map((l) => l.dueDate)).toEqual(["2026-08-31", "2026-09-30"]);
  });
});
