import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";
import { accountSchema } from "@uniquedev/haven-shared";
import { asc } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { accounts } from "../db/schema.js";

export const accountsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get("/accounts", { schema: { response: { 200: z.array(accountSchema) } } }, async () => {
    const rows = await db.select().from(accounts).orderBy(asc(accounts.name));
    return rows.map((row) => ({
      id: row.id,
      connectionId: row.connectionId,
      pluggyAccountId: row.pluggyAccountId,
      name: row.name,
      type: row.type,
      balanceCents: row.balanceCents,
      updatedAt: row.updatedAt.toISOString(),
    }));
  });
};
