import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";
import { categorySchema, createCategorySchema, updateCategorySchema } from "@haven/shared";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { categories } from "../db/schema.js";

const idParams = z.object({ id: z.uuid() });
const notFound = z.object({ error: z.string() });

export const categoriesRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get("/categories", { schema: { response: { 200: z.array(categorySchema) } } }, async () =>
    db.select().from(categories).orderBy(asc(categories.name)),
  );

  app.post(
    "/categories",
    { schema: { body: createCategorySchema, response: { 201: categorySchema } } },
    async (request, reply) => {
      const [row] = await db
        .insert(categories)
        .values({ name: request.body.name, parentId: request.body.parentId ?? null })
        .returning();
      return reply.code(201).send(row);
    },
  );

  app.patch(
    "/categories/:id",
    {
      schema: {
        params: idParams,
        body: updateCategorySchema,
        response: { 200: categorySchema, 404: notFound },
      },
    },
    async (request, reply) => {
      const [row] = await db
        .update(categories)
        .set(request.body)
        .where(eq(categories.id, request.params.id))
        .returning();
      if (!row) {
        return reply.code(404).send({ error: "category_not_found" });
      }
      return row;
    },
  );

  app.delete(
    "/categories/:id",
    { schema: { params: idParams, response: { 204: z.null(), 404: notFound } } },
    async (request, reply) => {
      const deleted = await db
        .delete(categories)
        .where(eq(categories.id, request.params.id))
        .returning({ id: categories.id });
      if (deleted.length === 0) {
        return reply.code(404).send({ error: "category_not_found" });
      }
      return reply.code(204).send(null);
    },
  );
};
