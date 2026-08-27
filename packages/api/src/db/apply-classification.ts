import { matchingCategoryRule, matchingRecurringEntry, normalizeDescription } from "@haven/shared";
import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { categoryRules, recurringEntries, transactions } from "./schema.js";

export async function applyLearnedClassification(): Promise<void> {
  const rules = await db.select().from(categoryRules);
  const entries = await db.select().from(recurringEntries);
  const rows = await db.select().from(transactions);

  for (const row of rows) {
    const updates: {
      customCategoryId?: string;
      recurringEntryId?: string;
    } = {};

    if (!row.customCategoryId) {
      const rule = matchingCategoryRule(row.description, rules);
      if (rule) updates.customCategoryId = rule.categoryId;
    }

    if (!row.recurringEntryId) {
      const entry = matchingRecurringEntry(row.description, entries);
      if (entry) updates.recurringEntryId = entry.id;
    }

    if (updates.customCategoryId || updates.recurringEntryId) {
      await db.update(transactions).set(updates).where(eq(transactions.id, row.id));
    }
  }
}

export async function learnCategoryRule(description: string, categoryId: string): Promise<void> {
  const pattern = normalizeDescription(description);
  if (!pattern) return;

  const existing = await db.select().from(categoryRules);
  const priority = existing.reduce((max, rule) => Math.max(max, rule.priority), 0) + 1;
  const current = existing.find((rule) => rule.pattern === pattern);

  if (current) {
    await db
      .update(categoryRules)
      .set({ categoryId, priority, updatedAt: new Date() })
      .where(eq(categoryRules.id, current.id));
    return;
  }

  await db.insert(categoryRules).values({ pattern, categoryId, priority });
}
