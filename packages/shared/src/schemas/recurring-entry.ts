import { z } from "zod";

export const recurringKindSchema = z.enum(["income", "expense"]);
export type RecurringKind = z.infer<typeof recurringKindSchema>;

export const recurringCadenceSchema = z.enum(["monthly", "yearly"]);
export type RecurringCadence = z.infer<typeof recurringCadenceSchema>;

const recurringEntryFields = {
  kind: recurringKindSchema,
  name: z.string().trim().min(1),
  amountCents: z.number().int().positive(),
  cadence: recurringCadenceSchema,
  dueDay: z.number().int().min(1).max(31),
  dueMonth: z.number().int().min(1).max(12).nullable(),
  categoryId: z.uuid().nullable(),
  activeFrom: z.iso.date(),
  activeUntil: z.iso.date().nullable(),
  matchPattern: z.string().trim().min(1).nullable(),
};

export const recurringEntrySchema = z.object({
  id: z.uuid(),
  ...recurringEntryFields,
});

export type RecurringEntry = z.infer<typeof recurringEntrySchema>;

function requiresDueMonthForYearly(
  value: { cadence?: RecurringCadence; dueMonth?: number | null },
  ctx: z.RefinementCtx,
) {
  if (value.cadence === "yearly" && value.dueMonth == null) {
    ctx.addIssue({
      code: "custom",
      path: ["dueMonth"],
      message: "dueMonth is required for yearly entries",
    });
  }
}

export const createRecurringEntrySchema = z
  .object({
    ...recurringEntryFields,
    dueMonth: recurringEntryFields.dueMonth.optional().default(null),
    categoryId: recurringEntryFields.categoryId.optional().default(null),
    activeUntil: recurringEntryFields.activeUntil.optional().default(null),
    matchPattern: recurringEntryFields.matchPattern.optional().default(null),
  })
  .superRefine(requiresDueMonthForYearly);

export type CreateRecurringEntryInput = z.input<typeof createRecurringEntrySchema>;

export const updateRecurringEntrySchema = z
  .object(recurringEntryFields)
  .partial()
  .superRefine(requiresDueMonthForYearly);

export type UpdateRecurringEntryInput = z.input<typeof updateRecurringEntrySchema>;

export const recurringSuggestionSchema = z.object({
  name: z.string(),
  amountCents: z.number().int().positive(),
  cadence: z.literal("monthly"),
  dueDay: z.number().int().min(1).max(31),
  matchPattern: z.string(),
  occurrenceCount: z.number().int().positive(),
});

export type RecurringSuggestion = z.infer<typeof recurringSuggestionSchema>;
