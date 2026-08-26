import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";
import {
  createPlannedPurchaseSchema,
  PURCHASE_TRANSITIONS,
  plannedPurchaseSchema,
  purchaseTransitionSchema,
  updatePlannedPurchaseSchema,
} from "@uniquedev/haven-shared";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { plannedPurchases } from "../db/schema.js";

type PurchaseRow = typeof plannedPurchases.$inferSelect;

export function serializePurchase(row: PurchaseRow) {
  return {
    id: row.id,
    name: row.name,
    totalCents: row.totalCents,
    plannedDate: row.plannedDate,
    paymentMode: row.paymentMode,
    installmentsCount: row.installmentsCount,
    status: row.status,
    categoryId: row.categoryId,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const idParams = z.object({ id: z.uuid() });
const errorBody = z.object({ error: z.string() });

export const purchasesRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/purchases",
    { schema: { response: { 200: z.array(plannedPurchaseSchema) } } },
    async () => {
      const rows = await db
        .select()
        .from(plannedPurchases)
        .orderBy(asc(plannedPurchases.plannedDate), asc(plannedPurchases.name));
      return rows.map(serializePurchase);
    },
  );

  app.post(
    "/purchases",
    { schema: { body: createPlannedPurchaseSchema, response: { 201: plannedPurchaseSchema } } },
    async (request, reply) => {
      const [row] = await db.insert(plannedPurchases).values(request.body).returning();
      return reply.code(201).send(serializePurchase(row!));
    },
  );

  app.patch(
    "/purchases/:id",
    {
      schema: {
        params: idParams,
        body: updatePlannedPurchaseSchema,
        response: { 200: plannedPurchaseSchema, 404: errorBody },
      },
    },
    async (request, reply) => {
      const [row] = await db
        .update(plannedPurchases)
        .set({ ...request.body, updatedAt: new Date() })
        .where(eq(plannedPurchases.id, request.params.id))
        .returning();
      if (!row) {
        return reply.code(404).send({ error: "purchase_not_found" });
      }
      return serializePurchase(row);
    },
  );

  app.post(
    "/purchases/:id/:transition",
    {
      schema: {
        params: idParams.extend({ transition: purchaseTransitionSchema }),
        response: { 200: plannedPurchaseSchema, 404: errorBody, 409: errorBody },
      },
    },
    async (request, reply) => {
      const [current] = await db
        .select()
        .from(plannedPurchases)
        .where(eq(plannedPurchases.id, request.params.id));
      if (!current) {
        return reply.code(404).send({ error: "purchase_not_found" });
      }
      const transition = PURCHASE_TRANSITIONS[request.params.transition];
      if (!transition.from.includes(current.status)) {
        return reply
          .code(409)
          .send({ error: `cannot_${request.params.transition}_from_${current.status}` });
      }
      const [row] = await db
        .update(plannedPurchases)
        .set({ status: transition.to, updatedAt: new Date() })
        .where(eq(plannedPurchases.id, current.id))
        .returning();
      return serializePurchase(row!);
    },
  );
};
