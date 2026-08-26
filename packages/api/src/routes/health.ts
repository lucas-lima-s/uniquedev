import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";
import { z } from "zod";
import { env } from "../env.js";

export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/health",
    {
      schema: {
        response: {
          200: z.object({
            status: z.literal("ok"),
            provider: z.enum(["pluggy", "mock"]),
          }),
        },
      },
    },
    async () => ({ status: "ok" as const, provider: env.DATA_PROVIDER }),
  );
};
