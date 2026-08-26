import { z } from "zod";

export const bankConnectionSchema = z.object({
  id: z.uuid(),
  pluggyItemId: z.string(),
  institutionName: z.string(),
  status: z.string(),
  lastSyncedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});

export type BankConnection = z.infer<typeof bankConnectionSchema>;

export const registerConnectionSchema = z.object({
  itemId: z.string().min(1),
});

export const connectTokenSchema = z.object({
  accessToken: z.string(),
});
