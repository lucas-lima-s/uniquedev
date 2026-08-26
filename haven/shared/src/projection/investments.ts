import type { AssetType, InvestmentAsset, InvestmentsSummary } from "../schemas/investment.js";
import { share } from "./share.js";

export function summarizeInvestments(assets: InvestmentAsset[]): InvestmentsSummary {
  const totalValueCents = assets.reduce((sum, asset) => sum + asset.currentValueCents, 0);
  const totalInvestedCents = assets.reduce((sum, asset) => sum + asset.investedCents, 0);

  const byTypeMap = new Map<AssetType, { valueCents: number; investedCents: number }>();
  for (const asset of assets) {
    const current = byTypeMap.get(asset.assetType) ?? { valueCents: 0, investedCents: 0 };
    current.valueCents += asset.currentValueCents;
    current.investedCents += asset.investedCents;
    byTypeMap.set(asset.assetType, current);
  }

  const byType = [...byTypeMap.entries()]
    .map(([assetType, totals]) => ({
      assetType,
      value: share(totals.valueCents, totalValueCents),
      investedCents: totals.investedCents,
      gain: share(totals.valueCents - totals.investedCents, totals.investedCents),
    }))
    .sort((a, b) => b.value.cents - a.value.cents);

  return {
    totalValueCents,
    totalInvestedCents,
    gain: share(totalValueCents - totalInvestedCents, totalInvestedCents),
    byType,
    assets,
  };
}
