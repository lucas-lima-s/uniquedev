import { z } from "zod";

export const calendarEventSchema = z.object({
  date: z.iso.date(),
  name: z.string(),
  amountCents: z.number().int(),
  kind: z.enum(["recurring", "purchase", "credit_card", "bill"]),
});

export type CalendarEvent = z.infer<typeof calendarEventSchema>;

export const calendarQuerySchema = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
});
