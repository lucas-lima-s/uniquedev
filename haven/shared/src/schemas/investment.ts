import { z } from "zod";
import { shareSchema } from "./dashboard.js";

export const assetTypeSchema = z.enum([
  "fixed_income",
  "stocks",
  "funds",
  "pension",
  "crypto",
  "other",
]);
export type AssetType = z.infer<typeof assetTypeSchema>;

export const assetSourceSchema = z.enum(["pluggy", "manual"]);
export type AssetSource = z.infer<typeof assetSourceSchema>;

export const investmentAssetSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  assetType: assetTypeSchema,
  source: assetSourceSchema,
  pluggyInvestmentId: z.string().nullable(),
  connectionId: z.uuid().nullable(),
  investedCents: z.number().int(),
  currentValueCents: z.number().int(),
  updatedAt: z.iso.datetime(),
});

export type InvestmentAsset = z.infer<typeof investmentAssetSchema>;

export const createInvestmentAssetSchema = z.object({
  name: z.string().trim().min(1),
  assetType: assetTypeSchema,
  investedCents: z.number().int().nonnegative(),
  currentValueCents: z.number().int().nonnegative(),
});

export type CreateInvestmentAssetInput = z.input<typeof createInvestmentAssetSchema>;

export const updateInvestmentAssetSchema = createInvestmentAssetSchema.partial();

export type UpdateInvestmentAssetInput = z.input<typeof updateInvestmentAssetSchema>;

export const assetTypeBreakdownSchema = z.object({
  assetType: assetTypeSchema,
  value: shareSchema,
  investedCents: z.number().int(),
  gain: shareSchema,
});

export type AssetTypeBreakdown = z.infer<typeof assetTypeBreakdownSchema>;

export const investmentsSummarySchema = z.object({
  totalValueCents: z.number().int(),
  totalInvestedCents: z.number().int(),
  gain: shareSchema,
  byType: z.array(assetTypeBreakdownSchema),
  assets: z.array(investmentAssetSchema),
});

export type InvestmentsSummary = z.infer<typeof investmentsSummarySchema>;

export const investmentHistoryPointSchema = z.object({
  date: z.iso.date(),
  valueCents: z.number().int(),
  investedCents: z.number().int(),
});

export type InvestmentHistoryPoint = z.infer<typeof investmentHistoryPointSchema>;

export const investmentHistoryQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(120).default(12),
});
