import type { RecurringEntry, RecurringKind } from "../schemas/recurring-entry.js";
import { dateInMonth, monthEnd, splitMonth } from "./month.js";

export interface RecurringLine {
  source: "recurring";
  entryId: string;
  name: string;
  kind: RecurringKind;
  categoryId: string | null;
  amountCents: number;
  dueDate: string;
  provision: boolean;
}

export function monthlyEquivalentCents(
  entry: Pick<RecurringEntry, "cadence" | "amountCents">,
): number {
  return entry.cadence === "monthly" ? entry.amountCents : Math.round(entry.amountCents / 12);
}

export function yearlyEquivalentCents(
  entry: Pick<RecurringEntry, "cadence" | "amountCents">,
): number {
  return entry.cadence === "monthly" ? entry.amountCents * 12 : entry.amountCents;
}

export function isActiveIn(
  entry: Pick<RecurringEntry, "activeFrom" | "activeUntil">,
  month: string,
): boolean {
  return (
    entry.activeFrom <= monthEnd(month) &&
    (entry.activeUntil === null || entry.activeUntil >= month)
  );
}

function nextDueDate(entry: RecurringEntry, month: string): string {
  if (entry.cadence === "monthly" || entry.dueMonth === null) {
    return dateInMonth(month, entry.dueDay);
  }
  const { year, monthIndex } = splitMonth(month);
  const dueYear = entry.dueMonth >= monthIndex ? year : year + 1;
  return dateInMonth(`${dueYear}-${String(entry.dueMonth).padStart(2, "0")}-01`, entry.dueDay);
}

export function expandRecurring(entries: RecurringEntry[], month: string): RecurringLine[] {
  return entries
    .filter((entry) => isActiveIn(entry, month))
    .map((entry) => ({
      source: "recurring" as const,
      entryId: entry.id,
      name: entry.name,
      kind: entry.kind,
      categoryId: entry.categoryId,
      amountCents: monthlyEquivalentCents(entry),
      dueDate: nextDueDate(entry, month),
      provision: entry.cadence === "yearly",
    }));
}
