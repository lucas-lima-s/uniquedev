import { z } from "zod";

export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-01$/, "expected YYYY-MM-01");

export const budgetSchema = z.object({
  id: z.uuid(),
  categoryId: z.uuid(),
  month: monthSchema,
  limitCents: z.number().int().nonnegative(),
});

export type Budget = z.infer<typeof budgetSchema>;

export const budgetsQuerySchema = z.object({
  month: monthSchema,
});

export const upsertBudgetSchema = z.object({
  categoryId: z.uuid(),
  month: monthSchema,
  limitCents: z.number().int().nonnegative(),
});
