import { z } from "zod";

export const paymentModeSchema = z.enum(["cash", "installments"]);
export type PaymentMode = z.infer<typeof paymentModeSchema>;

export const purchaseStatusSchema = z.enum(["draft", "approved", "purchased", "cancelled"]);
export type PurchaseStatus = z.infer<typeof purchaseStatusSchema>;

const plannedPurchaseFields = {
  name: z.string().trim().min(1),
  totalCents: z.number().int().positive(),
  plannedDate: z.iso.date(),
  paymentMode: paymentModeSchema,
  installmentsCount: z.number().int().min(2).nullable(),
  categoryId: z.uuid().nullable(),
  notes: z.string().trim().nullable(),
};

export const plannedPurchaseSchema = z.object({
  id: z.uuid(),
  ...plannedPurchaseFields,
  status: purchaseStatusSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type PlannedPurchase = z.infer<typeof plannedPurchaseSchema>;

function requiresInstallmentsCount(
  value: { paymentMode?: PaymentMode; installmentsCount?: number | null },
  ctx: z.RefinementCtx,
) {
  if (value.paymentMode === "installments" && value.installmentsCount == null) {
    ctx.addIssue({
      code: "custom",
      path: ["installmentsCount"],
      message: "installmentsCount is required when paymentMode is installments",
    });
  }
}

export const createPlannedPurchaseSchema = z
  .object({
    ...plannedPurchaseFields,
    installmentsCount: plannedPurchaseFields.installmentsCount.optional().default(null),
    categoryId: plannedPurchaseFields.categoryId.optional().default(null),
    notes: plannedPurchaseFields.notes.optional().default(null),
  })
  .superRefine(requiresInstallmentsCount);

export type CreatePlannedPurchaseInput = z.input<typeof createPlannedPurchaseSchema>;

export const updatePlannedPurchaseSchema = z
  .object(plannedPurchaseFields)
  .partial()
  .superRefine(requiresInstallmentsCount);

export type UpdatePlannedPurchaseInput = z.input<typeof updatePlannedPurchaseSchema>;

export const purchaseTransitionSchema = z.enum(["approve", "cancel", "mark-purchased"]);
export type PurchaseTransition = z.infer<typeof purchaseTransitionSchema>;

export const PURCHASE_TRANSITIONS: Record<
  PurchaseTransition,
  { from: PurchaseStatus[]; to: PurchaseStatus }
> = {
  approve: { from: ["draft"], to: "approved" },
  cancel: { from: ["draft", "approved"], to: "cancelled" },
  "mark-purchased": { from: ["approved"], to: "purchased" },
};
