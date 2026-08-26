import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";
import {
  addMonths,
  buildMonthProjection,
  dashboardQuerySchema,
  dashboardSchema,
  monthStart,
} from "@uniquedev/haven-shared";
import { and, eq, gte, lt } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  accounts,
  budgets,
  categories,
  investmentAssets,
  plannedPurchases,
  recurringEntries,
  transactions,
} from "../db/schema.js";
import { serializePurchase } from "./purchases.js";
import { serializeRecurring } from "./recurring.js";

export const dashboardRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/dashboard",
    { schema: { querystring: dashboardQuerySchema, response: { 200: dashboardSchema } } },
    async (request) => {
      const month = request.query.month ?? monthStart(new Date());
      const from = new Date(`${month}T00:00:00.000Z`);
      const to = new Date(`${addMonths(month, 1)}T00:00:00.000Z`);

      const [
        recurringRows,
        purchaseRows,
        transactionRows,
        categoryRows,
        budgetRows,
        accountRows,
        investmentRows,
      ] = await Promise.all([
        db.select().from(recurringEntries),
        db.select().from(plannedPurchases).where(eq(plannedPurchases.status, "approved")),
        db
          .select()
          .from(transactions)
          .where(and(gte(transactions.date, from), lt(transactions.date, to))),
        db.select({ id: categories.id, name: categories.name }).from(categories),
        db
          .select({ categoryId: budgets.categoryId, limitCents: budgets.limitCents })
          .from(budgets)
          .where(eq(budgets.month, month)),
        db.select({ type: accounts.type, balanceCents: accounts.balanceCents }).from(accounts),
        db.select({ currentValueCents: investmentAssets.currentValueCents }).from(investmentAssets),
      ]);

      const projection = buildMonthProjection({
        month,
        recurring: recurringRows.map(serializeRecurring),
        purchases: purchaseRows.map(serializePurchase),
        transactions: transactionRows.map((row) => ({
          id: row.id,
          amountCents: row.amountCents,
          date: row.date.toISOString(),
          customCategoryId: row.customCategoryId,
          pluggyCategory: row.pluggyCategory,
          recurringEntryId: row.recurringEntryId,
          plannedPurchaseId: row.plannedPurchaseId,
        })),
        categories: categoryRows,
        budgets: budgetRows,
      });

      return {
        ...projection,
        accountsTotalCents: accountRows
          .filter((account) => account.type !== "credit_card")
          .reduce((sum, account) => sum + account.balanceCents, 0),
        creditCardDebtCents: accountRows
          .filter((account) => account.type === "credit_card")
          .reduce((sum, account) => sum + Math.abs(account.balanceCents), 0),
        investmentsTotalCents: investmentRows.reduce(
          (sum, asset) => sum + asset.currentValueCents,
          0,
        ),
      };
    },
  );
};
