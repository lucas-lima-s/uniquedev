import { z } from "zod";
import { monthSchema } from "./budget.js";

export const shareSchema = z.object({
  cents: z.number().int(),
  pct: z.number(),
});

export const categoryBreakdownSchema = z.object({
  categoryId: z.uuid().nullable(),
  name: z.string(),
  spent: shareSchema,
  budgetCents: z.number().int().nullable(),
  budgetUsedPct: z.number().nullable(),
});

export type CategoryBreakdown = z.infer<typeof categoryBreakdownSchema>;

export const committedLineSchema = z.object({
  source: z.enum(["recurring", "purchase", "goal", "credit_card"]),
  sourceId: z.uuid(),
  name: z.string(),
  categoryId: z.uuid().nullable(),
  amountCents: z.number().int(),
  dueDate: z.iso.date(),
  provision: z.boolean(),
  installmentLabel: z.string().nullable(),
});

export type CommittedLine = z.infer<typeof committedLineSchema>;

export const monthProjectionSchema = z.object({
  month: monthSchema,
  incomeCents: z.number().int(),
  realizedIncomeCents: z.number().int(),
  spentCents: z.number().int(),
  committedCents: z.number().int(),
  remainingCents: z.number().int(),
  spentShare: shareSchema,
  committedShare: shareSchema,
  remainingShare: shareSchema,
  byCategory: z.array(categoryBreakdownSchema),
  committed: z.array(committedLineSchema),
});

export type MonthProjection = z.infer<typeof monthProjectionSchema>;

export const dashboardSchema = monthProjectionSchema.extend({
  accountsTotalCents: z.number().int(),
  creditCardDebtCents: z.number().int(),
  investmentsTotalCents: z.number().int(),
});

export type Dashboard = z.infer<typeof dashboardSchema>;

export const dashboardQuerySchema = z.object({
  month: monthSchema.optional(),
});
