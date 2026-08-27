import { isActiveIn, monthlyEquivalentCents } from "./projection/recurring.js";
import type { RecurringEntry } from "./schemas/recurring-entry.js";

export function emergencyFundTargetCents(
  months: number,
  recurring: RecurringEntry[],
  month: string,
): number {
  const monthlyExpenses = recurring
    .filter((entry) => entry.kind === "expense" && isActiveIn(entry, month))
    .reduce((sum, entry) => sum + monthlyEquivalentCents(entry), 0);
  return months * monthlyExpenses;
}

export function goalProgressCents(input: {
  kind: "goal" | "emergency_fund";
  accountBalanceCents: number | null;
  contributionCents: number;
}): number {
  if (input.kind === "emergency_fund" && input.accountBalanceCents !== null) {
    return Math.max(0, input.accountBalanceCents);
  }
  return input.contributionCents;
}
