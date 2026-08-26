import { z } from "zod";

export const transactionSchema = z.object({
  id: z.uuid(),
  accountId: z.uuid(),
  pluggyTransactionId: z.string(),
  description: z.string(),
  amountCents: z.number().int(),
  date: z.iso.datetime(),
  pluggyCategory: z.string().nullable(),
  customCategoryId: z.uuid().nullable(),
  isPending: z.boolean(),
  installmentNumber: z.number().int().nullable(),
  installmentTotal: z.number().int().nullable(),
  recurringEntryId: z.uuid().nullable(),
  plannedPurchaseId: z.uuid().nullable(),
});

export type Transaction = z.infer<typeof transactionSchema>;

export const linkTransactionSchema = z.object({
  recurringEntryId: z.uuid().nullable().optional(),
  plannedPurchaseId: z.uuid().nullable().optional(),
});

export const transactionsQuerySchema = z.object({
  accountId: z.uuid().optional(),
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
});

export const updateTransactionCategorySchema = z.object({
  customCategoryId: z.uuid().nullable(),
});
