import { z } from "zod";

export const SETTINGS_ROW_ID = "00000000-0000-4000-8000-000000000001";

export const settingsSchema = z.object({
  emergencyFundMonths: z.number().int().min(1).max(36),
});

export type Settings = z.infer<typeof settingsSchema>;

export const updateSettingsSchema = settingsSchema.partial();

export type UpdateSettingsInput = z.input<typeof updateSettingsSchema>;

export const goalKindSchema = z.enum(["goal", "emergency_fund"]);
export type GoalKind = z.infer<typeof goalKindSchema>;

const goalFields = {
  name: z.string().trim().min(1),
  kind: goalKindSchema,
  targetCents: z.number().int().nonnegative(),
  deadline: z.iso.date().nullable(),
  accountId: z.uuid().nullable(),
  plannedMonthlyCents: z.number().int().positive().nullable(),
};

export const goalSchema = z.object({
  id: z.uuid(),
  ...goalFields,
  progressCents: z.number().int(),
  remainingCents: z.number().int(),
});

export type Goal = z.infer<typeof goalSchema>;

export const createGoalSchema = z.object({
  ...goalFields,
  targetCents: goalFields.targetCents.optional().default(0),
  deadline: goalFields.deadline.optional().default(null),
  accountId: goalFields.accountId.optional().default(null),
  plannedMonthlyCents: goalFields.plannedMonthlyCents.optional().default(null),
});

export type CreateGoalInput = z.input<typeof createGoalSchema>;

export const updateGoalSchema = z.object(goalFields).partial();

export type UpdateGoalInput = z.input<typeof updateGoalSchema>;

export const goalContributionSchema = z.object({
  id: z.uuid(),
  goalId: z.uuid(),
  amountCents: z.number().int().positive(),
  date: z.iso.date(),
  transactionId: z.uuid().nullable(),
});

export type GoalContribution = z.infer<typeof goalContributionSchema>;

export const createGoalContributionSchema = z.object({
  amountCents: z.number().int().positive(),
  date: z.iso.date(),
  transactionId: z.uuid().nullable().optional().default(null),
});

export type CreateGoalContributionInput = z.input<typeof createGoalContributionSchema>;
