import type { PlannedPurchase } from "../schemas/planned-purchase.js";
import { addMonths, dateInMonth, monthOf } from "./month.js";

export interface InstallmentLine {
  source: "purchase";
  purchaseId: string;
  name: string;
  categoryId: string | null;
  installmentNumber: number;
  installmentTotal: number;
  dueDate: string;
  amountCents: number;
}

export function expandPlannedPurchase(
  purchase: Pick<
    PlannedPurchase,
    | "id"
    | "name"
    | "categoryId"
    | "totalCents"
    | "plannedDate"
    | "paymentMode"
    | "installmentsCount"
  >,
): InstallmentLine[] {
  const count =
    purchase.paymentMode === "installments" ? Math.max(purchase.installmentsCount ?? 1, 1) : 1;
  const baseCents = Math.floor(purchase.totalCents / count);
  const remainderCents = purchase.totalCents - baseCents * count;
  const firstMonth = monthOf(purchase.plannedDate);
  const day = Number(purchase.plannedDate.slice(8, 10));

  return Array.from({ length: count }, (_, index) => ({
    source: "purchase" as const,
    purchaseId: purchase.id,
    name: purchase.name,
    categoryId: purchase.categoryId,
    installmentNumber: index + 1,
    installmentTotal: count,
    dueDate: dateInMonth(addMonths(firstMonth, index), day),
    amountCents: baseCents + (index === count - 1 ? remainderCents : 0),
  }));
}
