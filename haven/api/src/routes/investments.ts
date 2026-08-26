import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";
import {
  addMonths,
  createInvestmentAssetSchema,
  investmentAssetSchema,
  investmentHistoryPointSchema,
  investmentHistoryQuerySchema,
  investmentsSummarySchema,
  monthStart,
  summarizeInvestments,
  updateInvestmentAssetSchema,
} from "@uniquedev/haven-shared";
import { and, asc, eq, gte, sum } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { investmentAssets, investmentSnapshots } from "../db/schema.js";
import { snapshotInvestments } from "../jobs/snapshot-investments.js";

type AssetRow = typeof investmentAssets.$inferSelect;

export function serializeAsset(row: AssetRow) {
  return {
    id: row.id,
    name: row.name,
    assetType: row.assetType,
    source: row.source,
    pluggyInvestmentId: row.pluggyInvestmentId,
    connectionId: row.connectionId,
    investedCents: row.investedCents,
    currentValueCents: row.currentValueCents,
    updatedAt: row.updatedAt.toISOString(),
  };
}

const idParams = z.object({ id: z.uuid() });
const errorBody = z.object({ error: z.string() });

export const investmentsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get("/investments", { schema: { response: { 200: investmentsSummarySchema } } }, async () => {
    const rows = await db.select().from(investmentAssets).orderBy(asc(investmentAssets.name));
    return summarizeInvestments(rows.map(serializeAsset));
  });

  app.get(
    "/investments/history",
    {
      schema: {
        querystring: investmentHistoryQuerySchema,
        response: { 200: z.array(investmentHistoryPointSchema) },
      },
    },
    async (request) => {
      const from = addMonths(monthStart(new Date()), -request.query.months);
      return db
        .select({
          date: investmentSnapshots.snapshotDate,
          valueCents: sum(investmentSnapshots.valueCents).mapWith(Number),
          investedCents: sum(investmentSnapshots.investedCents).mapWith(Number),
        })
        .from(investmentSnapshots)
        .where(gte(investmentSnapshots.snapshotDate, from))
        .groupBy(investmentSnapshots.snapshotDate)
        .orderBy(asc(investmentSnapshots.snapshotDate));
    },
  );

  app.post(
    "/investments",
    { schema: { body: createInvestmentAssetSchema, response: { 201: investmentAssetSchema } } },
    async (request, reply) => {
      const [row] = await db
        .insert(investmentAssets)
        .values({ ...request.body, source: "manual" })
        .returning();
      await snapshotInvestments();
      return reply.code(201).send(serializeAsset(row!));
    },
  );

  app.patch(
    "/investments/:id",
    {
      schema: {
        params: idParams,
        body: updateInvestmentAssetSchema,
        response: { 200: investmentAssetSchema, 404: errorBody },
      },
    },
    async (request, reply) => {
      const [row] = await db
        .update(investmentAssets)
        .set({ ...request.body, updatedAt: new Date() })
        .where(eq(investmentAssets.id, request.params.id))
        .returning();
      if (!row) {
        return reply.code(404).send({ error: "investment_not_found" });
      }
      await snapshotInvestments();
      return serializeAsset(row);
    },
  );

  app.delete(
    "/investments/:id",
    { schema: { params: idParams, response: { 204: z.null(), 404: errorBody, 409: errorBody } } },
    async (request, reply) => {
      const [existing] = await db
        .select({ source: investmentAssets.source })
        .from(investmentAssets)
        .where(eq(investmentAssets.id, request.params.id));
      if (!existing) {
        return reply.code(404).send({ error: "investment_not_found" });
      }
      if (existing.source === "pluggy") {
        return reply.code(409).send({ error: "pluggy_assets_are_managed_by_sync" });
      }
      await db
        .delete(investmentAssets)
        .where(
          and(eq(investmentAssets.id, request.params.id), eq(investmentAssets.source, "manual")),
        );
      return reply.code(204).send(null);
    },
  );

  app.post(
    "/investments/snapshot",
    { schema: { response: { 200: z.object({ assets: z.number().int() }) } } },
    async () => ({ assets: await snapshotInvestments() }),
  );
};
