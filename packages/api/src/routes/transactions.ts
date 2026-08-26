import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";
import {
  linkTransactionSchema,
  transactionSchema,
  transactionsQuerySchema,
  updateTransactionCategorySchema,
} from "@haven/shared";
import { and, desc, eq, gte, lte, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { transactions } from "../db/schema.js";

type TransactionRow = typeof transactions.$inferSelect;

export function serializeTransaction(row: TransactionRow) {
  return {
    id: row.id,
    accountId: row.accountId,
    pluggyTransactionId: row.pluggyTransactionId,
    description: row.description,
    amountCents: row.amountCents,
    date: row.date.toISOString(),
    pluggyCategory: row.pluggyCategory,
    customCategoryId: row.customCategoryId,
    isPending: row.isPending,
    installmentNumber: row.installmentNumber,
    installmentTotal: row.installmentTotal,
    recurringEntryId: row.recurringEntryId,
    plannedPurchaseId: row.plannedPurchaseId,
  };
}

export const transactionsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/transactions",
    {
      schema: {
        querystring: transactionsQuerySchema,
        response: { 200: z.array(transactionSchema) },
      },
    },
    async (request) => {
      const { accountId, from, to } = request.query;
      const conditions: SQL[] = [];
      if (accountId) conditions.push(eq(transactions.accountId, accountId));
      if (from) conditions.push(gte(transactions.date, new Date(from)));
      if (to) conditions.push(lte(transactions.date, new Date(to)));

      const rows = await db
        .select()
        .from(transactions)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(transactions.date));

      return rows.map(serializeTransaction);
    },
  );

  app.patch(
    "/transactions/:id/category",
    {
      schema: {
        params: z.object({ id: z.uuid() }),
        body: updateTransactionCategorySchema,
        response: { 200: transactionSchema, 404: z.object({ error: z.string() }) },
      },
    },
    async (request, reply) => {
      const [row] = await db
        .update(transactions)
        .set({ customCategoryId: request.body.customCategoryId })
        .where(eq(transactions.id, request.params.id))
        .returning();
      if (!row) {
        return reply.code(404).send({ error: "transaction_not_found" });
      }
      return serializeTransaction(row);
    },
  );

  app.patch(
    "/transactions/:id/link",
    {
      schema: {
        params: z.object({ id: z.uuid() }),
        body: linkTransactionSchema,
        response: { 200: transactionSchema, 404: z.object({ error: z.string() }) },
      },
    },
    async (request, reply) => {
      const [row] = await db
        .update(transactions)
        .set(request.body)
        .where(eq(transactions.id, request.params.id))
        .returning();
      if (!row) {
        return reply.code(404).send({ error: "transaction_not_found" });
      }
      return serializeTransaction(row);
    },
  );
};
