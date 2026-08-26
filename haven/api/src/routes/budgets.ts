import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";
import { budgetSchema, budgetsQuerySchema, upsertBudgetSchema } from "@uniquedev/haven-shared";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { budgets } from "../db/schema.js";

export const budgetsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/budgets",
    { schema: { querystring: budgetsQuerySchema, response: { 200: z.array(budgetSchema) } } },
    async (request) => db.select().from(budgets).where(eq(budgets.month, request.query.month)),
  );

  app.put(
    "/budgets",
    { schema: { body: upsertBudgetSchema, response: { 200: budgetSchema } } },
    async (request) => {
      const [row] = await db
        .insert(budgets)
        .values(request.body)
        .onConflictDoUpdate({
          target: [budgets.categoryId, budgets.month],
          set: { limitCents: request.body.limitCents },
        })
        .returning();
      return row!;
    },
  );

  app.delete(
    "/budgets/:id",
    {
      schema: {
        params: z.object({ id: z.uuid() }),
        response: { 204: z.null(), 404: z.object({ error: z.string() }) },
      },
    },
    async (request, reply) => {
      const deleted = await db
        .delete(budgets)
        .where(eq(budgets.id, request.params.id))
        .returning({ id: budgets.id });
      if (deleted.length === 0) {
        return reply.code(404).send({ error: "budget_not_found" });
      }
      return reply.code(204).send(null);
    },
  );
};
