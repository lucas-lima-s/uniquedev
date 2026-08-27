import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";
import { SETTINGS_ROW_ID, settingsSchema, updateSettingsSchema } from "@haven/shared";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { settings } from "../db/schema.js";

export async function getOrCreateSettings() {
  const [existing] = await db.select().from(settings).where(eq(settings.id, SETTINGS_ROW_ID));
  if (existing) return existing;
  const [created] = await db
    .insert(settings)
    .values({ id: SETTINGS_ROW_ID, emergencyFundMonths: 6 })
    .returning();
  return created!;
}

function serializeSettings(row: typeof settings.$inferSelect) {
  return {
    emergencyFundMonths: row.emergencyFundMonths,
    largeTransactionThresholdCents: row.largeTransactionThresholdCents,
    alertsEnabled: row.alertsEnabled,
  };
}

export const settingsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get("/settings", { schema: { response: { 200: settingsSchema } } }, async () => {
    const row = await getOrCreateSettings();
    return serializeSettings(row);
  });

  app.patch(
    "/settings",
    { schema: { body: updateSettingsSchema, response: { 200: settingsSchema } } },
    async (request) => {
      await getOrCreateSettings();
      const [row] = await db
        .update(settings)
        .set({ ...request.body, updatedAt: new Date() })
        .where(eq(settings.id, SETTINGS_ROW_ID))
        .returning();
      return serializeSettings(row!);
    },
  );
};
