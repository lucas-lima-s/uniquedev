import { z } from "zod";

export const accountTypeSchema = z.enum(["checking", "savings", "credit_card", "investment"]);
export type AccountType = z.infer<typeof accountTypeSchema>;

export const accountSchema = z.object({
  id: z.uuid(),
  connectionId: z.uuid(),
  pluggyAccountId: z.string(),
  name: z.string(),
  type: accountTypeSchema,
  balanceCents: z.number().int(),
  updatedAt: z.iso.datetime(),
});

export type Account = z.infer<typeof accountSchema>;
