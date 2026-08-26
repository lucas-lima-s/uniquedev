import type { CategoryBreakdown, CommittedLine, MonthProjection } from "../schemas/dashboard.js";
import type { PlannedPurchase } from "../schemas/planned-purchase.js";
import type { RecurringEntry } from "../schemas/recurring-entry.js";
import { monthOf } from "./month.js";
import { expandPlannedPurchase } from "./purchase.js";
import { expandRecurring } from "./recurring.js";
import { share } from "./share.js";

export interface ProjectionTransaction {
  id: string;
  amountCents: number;
  date: string;
  customCategoryId: string | null;
  pluggyCategory: string | null;
  recurringEntryId: string | null;
  plannedPurchaseId: string | null;
}

export interface ProjectionInput {
  month: string;
  recurring: RecurringEntry[];
  purchases: PlannedPurchase[];
  transactions: ProjectionTransaction[];
  categories: { id: string; name: string }[];
  budgets: { categoryId: string; limitCents: number }[];
}

const UNCATEGORIZED = "Sem categoria";

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function buildMonthProjection(input: ProjectionInput): MonthProjection {
  const { month } = input;
  const inMonth = input.transactions.filter((tx) => monthOf(tx.date) === month);
  const matchedRecurring = new Set(inMonth.map((tx) => tx.recurringEntryId).filter(Boolean));
  const matchedPurchases = new Set(inMonth.map((tx) => tx.plannedPurchaseId).filter(Boolean));

  const recurringLines = expandRecurring(input.recurring, month);
  const incomeCents = sum(
    recurringLines.filter((line) => line.kind === "income").map((line) => line.amountCents),
  );

  const committed: CommittedLine[] = [
    ...recurringLines
      .filter((line) => line.kind === "expense" && !matchedRecurring.has(line.entryId))
      .map((line) => ({
        source: line.source,
        sourceId: line.entryId,
        name: line.name,
        categoryId: line.categoryId,
        amountCents: line.amountCents,
        dueDate: line.dueDate,
        provision: line.provision,
        installmentLabel: null,
      })),
    ...input.purchases
      .filter((purchase) => purchase.status === "approved" && !matchedPurchases.has(purchase.id))
      .flatMap((purchase) => expandPlannedPurchase(purchase))
      .filter((line) => monthOf(line.dueDate) === month)
      .map((line) => ({
        source: line.source,
        sourceId: line.purchaseId,
        name: line.name,
        categoryId: line.categoryId,
        amountCents: line.amountCents,
        dueDate: line.dueDate,
        provision: false,
        installmentLabel:
          line.installmentTotal > 1 ? `${line.installmentNumber}/${line.installmentTotal}` : null,
      })),
  ].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const expenses = inMonth.filter((tx) => tx.amountCents < 0);
  const spentCents = sum(expenses.map((tx) => -tx.amountCents));
  const realizedIncomeCents = sum(
    inMonth.filter((tx) => tx.amountCents > 0).map((tx) => tx.amountCents),
  );
  const committedCents = sum(committed.map((line) => line.amountCents));
  const remainingCents = incomeCents - spentCents - committedCents;

  const categoryName = new Map(input.categories.map((category) => [category.id, category.name]));
  const budgetByCategory = new Map(
    input.budgets.map((budget) => [budget.categoryId, budget.limitCents]),
  );
  const spentByKey = new Map<string, { categoryId: string | null; name: string; cents: number }>();
  for (const tx of expenses) {
    const key = tx.customCategoryId ?? `pluggy:${tx.pluggyCategory ?? ""}`;
    const current = spentByKey.get(key) ?? {
      categoryId: tx.customCategoryId,
      name: tx.customCategoryId
        ? (categoryName.get(tx.customCategoryId) ?? UNCATEGORIZED)
        : (tx.pluggyCategory ?? UNCATEGORIZED),
      cents: 0,
    };
    current.cents -= tx.amountCents;
    spentByKey.set(key, current);
  }

  const byCategory: CategoryBreakdown[] = [...spentByKey.values()]
    .map((entry) => {
      const budgetCents = entry.categoryId
        ? (budgetByCategory.get(entry.categoryId) ?? null)
        : null;
      return {
        categoryId: entry.categoryId,
        name: entry.name,
        spent: share(entry.cents, spentCents),
        budgetCents,
        budgetUsedPct: budgetCents && budgetCents > 0 ? share(entry.cents, budgetCents).pct : null,
      };
    })
    .sort((a, b) => b.spent.cents - a.spent.cents);

  return {
    month,
    incomeCents,
    realizedIncomeCents,
    spentCents,
    committedCents,
    remainingCents,
    spentShare: share(spentCents, incomeCents),
    committedShare: share(committedCents, incomeCents),
    remainingShare: share(remainingCents, incomeCents),
    byCategory,
    committed,
  };
}
