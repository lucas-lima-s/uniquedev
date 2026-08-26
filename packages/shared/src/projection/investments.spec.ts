import { describe, expect, it } from "vitest";
import type { InvestmentAsset } from "../schemas/investment.js";
import { summarizeInvestments } from "./investments.js";

function asset(
  partial: Partial<InvestmentAsset> &
    Pick<InvestmentAsset, "assetType" | "investedCents" | "currentValueCents">,
): InvestmentAsset {
  return {
    id: crypto.randomUUID(),
    name: partial.assetType,
    source: "manual",
    pluggyInvestmentId: null,
    connectionId: null,
    updatedAt: "2026-08-25T00:00:00.000Z",
    ...partial,
  };
}

describe("summarizeInvestments", () => {
  it("totals value and cost, computes gain and allocation per type", () => {
    const summary = summarizeInvestments([
      asset({ assetType: "fixed_income", investedCents: 500000, currentValueCents: 550000 }),
      asset({ assetType: "stocks", investedCents: 300000, currentValueCents: 250000 }),
      asset({ assetType: "stocks", investedCents: 100000, currentValueCents: 200000 }),
    ]);

    expect(summary.totalValueCents).toBe(1000000);
    expect(summary.totalInvestedCents).toBe(900000);
    expect(summary.gain).toEqual({ cents: 100000, pct: 11.11 });
    expect(summary.byType).toEqual([
      {
        assetType: "fixed_income",
        value: { cents: 550000, pct: 55 },
        investedCents: 500000,
        gain: { cents: 50000, pct: 10 },
      },
      {
        assetType: "stocks",
        value: { cents: 450000, pct: 45 },
        investedCents: 400000,
        gain: { cents: 50000, pct: 12.5 },
      },
    ]);
  });

  it("handles an empty portfolio", () => {
    expect(summarizeInvestments([])).toEqual({
      totalValueCents: 0,
      totalInvestedCents: 0,
      gain: { cents: 0, pct: 0 },
      byType: [],
      assets: [],
    });
  });
});
