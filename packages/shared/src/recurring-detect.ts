import { normalizeDescription } from "./matching.js";
import type { RecurringSuggestion } from "./schemas/recurring-entry.js";

export interface RecurringDetectTransaction {
  description: string;
  amountCents: number;
  date: string;
  recurringEntryId: string | null;
}

const MIN_OCCURRENCES = 3;
const AMOUNT_TOLERANCE = 0.15;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const even = sorted.length % 2 === 0;
  if (even) {
    return Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
  }
  return sorted[mid]!;
}

function dayOfMonth(isoDate: string): number {
  return Number(isoDate.slice(8, 10));
}

function yearMonth(isoDate: string): string {
  return isoDate.slice(0, 7);
}

function mode(values: number[]): number {
  const counts = new Map<number, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  let best = values[0] ?? 1;
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

function amountsAgree(values: number[]): boolean {
  const mid = median(values);
  if (mid <= 0) return false;
  return values.every(
    (value) => Math.abs(value - mid) / mid <= AMOUNT_TOLERANCE || Math.abs(value - mid) <= 500,
  );
}

export function detectRecurringSuggestions(
  transactions: RecurringDetectTransaction[],
  existingPatterns: string[],
): RecurringSuggestion[] {
  const normalizedExisting = existingPatterns.map(normalizeDescription).filter(Boolean);
  const groups = new Map<string, RecurringDetectTransaction[]>();

  for (const tx of transactions) {
    if (tx.amountCents >= 0 || tx.recurringEntryId) continue;
    const key = normalizeDescription(tx.description);
    if (!key) continue;
    if (normalizedExisting.some((pattern) => key.includes(pattern))) continue;
    const group = groups.get(key) ?? [];
    group.push(tx);
    groups.set(key, group);
  }

  const suggestions: RecurringSuggestion[] = [];
  for (const [key, group] of groups) {
    if (group.length < MIN_OCCURRENCES) continue;
    const months = new Set(group.map((tx) => yearMonth(tx.date)));
    if (months.size < MIN_OCCURRENCES) continue;
    const amounts = group.map((tx) => Math.abs(tx.amountCents));
    if (!amountsAgree(amounts)) continue;
    const first = group[0]!;
    suggestions.push({
      name: first.description.trim(),
      amountCents: median(amounts),
      cadence: "monthly",
      dueDay: mode(group.map((tx) => dayOfMonth(tx.date))),
      matchPattern: key,
      occurrenceCount: group.length,
    });
  }

  return suggestions.sort((a, b) => b.occurrenceCount - a.occurrenceCount);
}
