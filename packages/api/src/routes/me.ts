import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";
import { z } from "zod";

export const meRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/me",
    { schema: { response: { 200: z.object({ email: z.string(), sub: z.string() }) } } },
    async (request) => ({
      email: request.accessIdentity?.email ?? "",
      sub: request.accessIdentity?.sub ?? "",
    }),
  );
};
