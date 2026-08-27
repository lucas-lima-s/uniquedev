import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";
import {
  createGoalContributionSchema,
  createGoalSchema,
  emergencyFundTargetCents,
  goalContributionSchema,
  goalProgressCents,
  goalSchema,
  monthStart,
  updateGoalSchema,
} from "@haven/shared";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { accounts, goalContributions, goals, recurringEntries } from "../db/schema.js";
import { serializeRecurring } from "./recurring.js";
import { getOrCreateSettings } from "./settings.js";

type GoalRow = typeof goals.$inferSelect;
type ContributionRow = typeof goalContributions.$inferSelect;

async function resolveGoalView(row: GoalRow) {
  const settings = await getOrCreateSettings();
  const month = monthStart(new Date());
  const recurring = (await db.select().from(recurringEntries)).map(serializeRecurring);
  const contributions = await db
    .select()
    .from(goalContributions)
    .where(eq(goalContributions.goalId, row.id));
  const contributionCents = contributions.reduce((sum, item) => sum + item.amountCents, 0);
  let accountBalanceCents: number | null = null;
  if (row.accountId) {
    const [account] = await db.select().from(accounts).where(eq(accounts.id, row.accountId));
    accountBalanceCents = account?.balanceCents ?? 0;
  }
  const targetCents =
    row.kind === "emergency_fund"
      ? emergencyFundTargetCents(settings.emergencyFundMonths, recurring, month)
      : row.targetCents;
  const progressCents = goalProgressCents({
    kind: row.kind,
    accountBalanceCents,
    contributionCents,
  });
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    targetCents,
    deadline: row.deadline,
    accountId: row.accountId,
    plannedMonthlyCents: row.plannedMonthlyCents,
    progressCents,
    remainingCents: Math.max(0, targetCents - progressCents),
  };
}

function serializeContribution(row: ContributionRow) {
  return {
    id: row.id,
    goalId: row.goalId,
    amountCents: row.amountCents,
    date: row.date,
    transactionId: row.transactionId,
  };
}

const idParams = z.object({ id: z.uuid() });
const notFound = z.object({ error: z.string() });

export const goalsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get("/goals", { schema: { response: { 200: z.array(goalSchema) } } }, async () => {
    const rows = await db.select().from(goals);
    return Promise.all(rows.map(resolveGoalView));
  });

  app.post(
    "/goals",
    {
      schema: {
        body: createGoalSchema,
        response: { 201: goalSchema, 409: notFound },
      },
    },
    async (request, reply) => {
      if (request.body.kind === "emergency_fund") {
        const [existing] = await db.select().from(goals).where(eq(goals.kind, "emergency_fund"));
        if (existing) {
          return reply.code(409).send({ error: "emergency_fund_exists" });
        }
      }
      const [row] = await db.insert(goals).values(request.body).returning();
      return reply.code(201).send(await resolveGoalView(row!));
    },
  );

  app.patch(
    "/goals/:id",
    {
      schema: {
        params: idParams,
        body: updateGoalSchema,
        response: { 200: goalSchema, 404: notFound },
      },
    },
    async (request, reply) => {
      const [row] = await db
        .update(goals)
        .set({ ...request.body, updatedAt: new Date() })
        .where(eq(goals.id, request.params.id))
        .returning();
      if (!row) return reply.code(404).send({ error: "goal_not_found" });
      return resolveGoalView(row);
    },
  );

  app.delete(
    "/goals/:id",
    { schema: { params: idParams, response: { 204: z.null(), 404: notFound } } },
    async (request, reply) => {
      const deleted = await db
        .delete(goals)
        .where(eq(goals.id, request.params.id))
        .returning({ id: goals.id });
      if (deleted.length === 0) return reply.code(404).send({ error: "goal_not_found" });
      return reply.code(204).send(null);
    },
  );

  app.get(
    "/goals/:id/contributions",
    {
      schema: {
        params: idParams,
        response: { 200: z.array(goalContributionSchema), 404: notFound },
      },
    },
    async (request, reply) => {
      const [goal] = await db.select().from(goals).where(eq(goals.id, request.params.id));
      if (!goal) return reply.code(404).send({ error: "goal_not_found" });
      const rows = await db
        .select()
        .from(goalContributions)
        .where(eq(goalContributions.goalId, goal.id));
      return rows.map(serializeContribution);
    },
  );

  app.post(
    "/goals/:id/contributions",
    {
      schema: {
        params: idParams,
        body: createGoalContributionSchema,
        response: { 201: goalContributionSchema, 404: notFound },
      },
    },
    async (request, reply) => {
      const [goal] = await db.select().from(goals).where(eq(goals.id, request.params.id));
      if (!goal) return reply.code(404).send({ error: "goal_not_found" });
      const [row] = await db
        .insert(goalContributions)
        .values({ goalId: goal.id, ...request.body })
        .returning();
      return reply.code(201).send(serializeContribution(row!));
    },
  );
};
