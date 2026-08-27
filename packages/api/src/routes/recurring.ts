import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";
import {
  createRecurringEntrySchema,
  detectRecurringSuggestions,
  recurringEntrySchema,
  recurringSuggestionSchema,
  updateRecurringEntrySchema,
} from "@haven/shared";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { applyLearnedClassification } from "../db/apply-classification.js";
import { db } from "../db/client.js";
import { recurringEntries, transactions } from "../db/schema.js";

type RecurringRow = typeof recurringEntries.$inferSelect;

export function serializeRecurring(row: RecurringRow) {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    amountCents: row.amountCents,
    cadence: row.cadence,
    dueDay: row.dueDay,
    dueMonth: row.dueMonth,
    categoryId: row.categoryId,
    activeFrom: row.activeFrom,
    activeUntil: row.activeUntil,
    matchPattern: row.matchPattern,
  };
}

const idParams = z.object({ id: z.uuid() });
const notFound = z.object({ error: z.string() });

export const recurringRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/recurring",
    { schema: { response: { 200: z.array(recurringEntrySchema) } } },
    async () => {
      const rows = await db
        .select()
        .from(recurringEntries)
        .orderBy(
          asc(recurringEntries.kind),
          asc(recurringEntries.dueDay),
          asc(recurringEntries.name),
        );
      return rows.map(serializeRecurring);
    },
  );

  app.get(
    "/recurring/suggestions",
    { schema: { response: { 200: z.array(recurringSuggestionSchema) } } },
    async () => {
      const [rows, entries] = await Promise.all([
        db.select().from(transactions),
        db.select().from(recurringEntries),
      ]);
      return detectRecurringSuggestions(
        rows.map((row) => ({
          description: row.description,
          amountCents: row.amountCents,
          date: row.date.toISOString(),
          recurringEntryId: row.recurringEntryId,
        })),
        entries.flatMap((entry) => (entry.matchPattern ? [entry.matchPattern] : [])),
      );
    },
  );

  app.post(
    "/recurring",
    { schema: { body: createRecurringEntrySchema, response: { 201: recurringEntrySchema } } },
    async (request, reply) => {
      const [row] = await db.insert(recurringEntries).values(request.body).returning();
      await applyLearnedClassification();
      return reply.code(201).send(serializeRecurring(row!));
    },
  );

  app.patch(
    "/recurring/:id",
    {
      schema: {
        params: idParams,
        body: updateRecurringEntrySchema,
        response: { 200: recurringEntrySchema, 404: notFound },
      },
    },
    async (request, reply) => {
      const [row] = await db
        .update(recurringEntries)
        .set({ ...request.body, updatedAt: new Date() })
        .where(eq(recurringEntries.id, request.params.id))
        .returning();
      if (!row) {
        return reply.code(404).send({ error: "recurring_entry_not_found" });
      }
      return serializeRecurring(row);
    },
  );

  app.delete(
    "/recurring/:id",
    { schema: { params: idParams, response: { 204: z.null(), 404: notFound } } },
    async (request, reply) => {
      const deleted = await db
        .delete(recurringEntries)
        .where(eq(recurringEntries.id, request.params.id))
        .returning({ id: recurringEntries.id });
      if (deleted.length === 0) {
        return reply.code(404).send({ error: "recurring_entry_not_found" });
      }
      return reply.code(204).send(null);
    },
  );
};
