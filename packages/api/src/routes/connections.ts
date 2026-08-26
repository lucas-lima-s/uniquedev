import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";
import { bankConnectionSchema, connectTokenSchema, registerConnectionSchema } from "@haven/shared";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { bankConnections } from "../db/schema.js";
import { env } from "../env.js";
import { provider } from "../providers/index.js";
import { syncItem } from "../sync/sync-item.js";

type ConnectionRow = typeof bankConnections.$inferSelect;

function serializeConnection(row: ConnectionRow) {
  return {
    id: row.id,
    pluggyItemId: row.pluggyItemId,
    institutionName: row.institutionName,
    status: row.status,
    lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export const connectionsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/connections",
    { schema: { response: { 200: z.array(bankConnectionSchema) } } },
    async () => {
      const rows = await db
        .select()
        .from(bankConnections)
        .orderBy(asc(bankConnections.institutionName));
      return rows.map(serializeConnection);
    },
  );

  app.post(
    "/connections/token",
    { schema: { response: { 200: connectTokenSchema } } },
    async () => {
      const { accessToken } = await provider.createConnectToken(env.WEBHOOK_PUBLIC_URL);
      return { accessToken };
    },
  );

  app.post(
    "/connections",
    {
      schema: {
        body: registerConnectionSchema,
        response: { 200: z.object({ ok: z.literal(true) }) },
      },
    },
    async (request) => {
      await syncItem(request.body.itemId);
      return { ok: true as const };
    },
  );

  app.post(
    "/connections/:id/sync",
    {
      schema: {
        params: z.object({ id: z.uuid() }),
        response: { 200: bankConnectionSchema, 404: z.object({ error: z.string() }) },
      },
    },
    async (request, reply) => {
      const [connection] = await db
        .select()
        .from(bankConnections)
        .where(eq(bankConnections.id, request.params.id));
      if (!connection) {
        return reply.code(404).send({ error: "connection_not_found" });
      }
      await syncItem(connection.pluggyItemId);
      const [refreshed] = await db
        .select()
        .from(bankConnections)
        .where(eq(bankConnections.id, connection.id));
      return serializeConnection(refreshed ?? connection);
    },
  );
};
