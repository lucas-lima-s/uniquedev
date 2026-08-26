import { timingSafeEqual } from "node:crypto";
import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { webhookEvents } from "../db/schema.js";
import { env } from "../env.js";
import { syncItem } from "../sync/sync-item.js";

const webhookBodySchema = z.looseObject({
  event: z.string(),
  eventId: z.string().optional(),
  itemId: z.string().optional(),
});

const webhookQuerySchema = z.object({
  token: z.string().optional(),
});

const SYNC_EVENTS = new Set([
  "item/created",
  "item/updated",
  "item/login_succeeded",
  "transactions/created",
  "transactions/updated",
  "transactions/deleted",
]);

function secretMatches(candidate: unknown): boolean {
  if (typeof candidate !== "string" || candidate.length === 0) return false;
  const expected = Buffer.from(env.WEBHOOK_SECRET);
  const received = Buffer.from(candidate);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export const webhooksRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/webhooks",
    {
      schema: {
        body: webhookBodySchema,
        querystring: webhookQuerySchema,
        response: {
          200: z.object({ received: z.literal(true) }),
          401: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const isValid =
        secretMatches(request.headers["x-webhook-secret"]) || secretMatches(request.query.token);
      if (!isValid) {
        return reply.code(401).send({ error: "invalid_webhook_secret" });
      }

      const { event, itemId } = request.body;
      const [stored] = await db
        .insert(webhookEvents)
        .values({ eventType: event, payload: request.body })
        .returning({ id: webhookEvents.id });

      await reply.code(200).send({ received: true });

      if (!stored) return;
      if (!itemId || !SYNC_EVENTS.has(event)) {
        await db
          .update(webhookEvents)
          .set({ status: "processed", processedAt: new Date() })
          .where(eq(webhookEvents.id, stored.id));
        return;
      }

      try {
        await syncItem(itemId);
        await db
          .update(webhookEvents)
          .set({ status: "processed", processedAt: new Date() })
          .where(eq(webhookEvents.id, stored.id));
      } catch (error) {
        request.log.error({ err: error, itemId, event }, "webhook sync failed");
        await db
          .update(webhookEvents)
          .set({
            status: "error",
            processedAt: new Date(),
            error: error instanceof Error ? error.message : String(error),
          })
          .where(eq(webhookEvents.id, stored.id));
      }
    },
  );
};
