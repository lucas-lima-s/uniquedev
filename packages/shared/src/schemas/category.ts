import { z } from "zod";

export const categorySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  parentId: z.uuid().nullable(),
});

export type Category = z.infer<typeof categorySchema>;

export const createCategorySchema = z.object({
  name: z.string().trim().min(1),
  parentId: z.uuid().nullable().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();
