import { describe, expect, it } from "vitest";
import { expandRemainingInstallments, remainingInstallmentsForMonth } from "./installments.js";

const tv = {
  id: "tx-1",
  description: "Loja de eletrônicos",
  amountCents: -30000,
  date: "2026-06-15T12:00:00.000Z",
  installmentNumber: 3,
  installmentTotal: 6,
};

describe("expandRemainingInstallments", () => {
  it("projects the unpaid tail of an installment purchase", () => {
    const lines = expandRemainingInstallments(tv);
    expect(lines).toHaveLength(3);
    expect(lines[0]?.dueDate).toBe("2026-07-15");
    expect(lines[0]?.installmentNumber).toBe(4);
    expect(lines[2]?.dueDate).toBe("2026-09-15");
  });
});

describe("remainingInstallmentsForMonth", () => {
  it("keeps only the latest row of the same purchase", () => {
    const later = { ...tv, id: "tx-2", installmentNumber: 4, date: "2026-07-15T12:00:00.000Z" };
    const august = remainingInstallmentsForMonth([tv, later], "2026-08-01");
    expect(august).toHaveLength(1);
    expect(august[0]?.installmentNumber).toBe(5);
  });
});
