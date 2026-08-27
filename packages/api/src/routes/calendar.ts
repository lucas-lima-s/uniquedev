import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";
import {
  addMonths,
  calendarEventSchema,
  calendarQuerySchema,
  expandPlannedPurchase,
  expandRecurring,
  monthOf,
  remainingInstallmentsForMonth,
} from "@haven/shared";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { creditCardBills, plannedPurchases, recurringEntries, transactions } from "../db/schema.js";
import { serializePurchase } from "./purchases.js";
import { serializeRecurring } from "./recurring.js";

function inRange(date: string, from: string, to: string): boolean {
  return date >= from && date <= to;
}

export const calendarRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/calendar",
    {
      schema: {
        querystring: calendarQuerySchema,
        response: { 200: z.array(calendarEventSchema) },
      },
    },
    async (request) => {
      const from = request.query.from ?? new Date().toISOString().slice(0, 10);
      const today = new Date();
      const defaultTo = new Date(today);
      defaultTo.setUTCDate(defaultTo.getUTCDate() + 30);
      const to = request.query.to ?? defaultTo.toISOString().slice(0, 10);

      const [recurringRows, purchaseRows, transactionRows, billRows] = await Promise.all([
        db.select().from(recurringEntries),
        db.select().from(plannedPurchases).where(eq(plannedPurchases.status, "approved")),
        db.select().from(transactions),
        db.select().from(creditCardBills),
      ]);

      const events: z.infer<typeof calendarEventSchema>[] = [];
      const cursor = monthOf(from);
      const last = monthOf(to);
      let month = cursor;
      while (month <= last) {
        for (const line of expandRecurring(recurringRows.map(serializeRecurring), month)) {
          if (line.kind === "expense" && inRange(line.dueDate, from, to)) {
            events.push({
              date: line.dueDate,
              name: line.name,
              amountCents: line.amountCents,
              kind: "recurring",
            });
          }
        }
        month = addMonths(month, 1);
      }

      for (const purchase of purchaseRows.map(serializePurchase)) {
        for (const line of expandPlannedPurchase(purchase)) {
          if (inRange(line.dueDate, from, to)) {
            events.push({
              date: line.dueDate,
              name: purchase.name,
              amountCents: line.amountCents,
              kind: "purchase",
            });
          }
        }
      }

      const installmentTxs = transactionRows.map((row) => ({
        id: row.id,
        description: row.description,
        amountCents: row.amountCents,
        date: row.date.toISOString(),
        installmentNumber: row.installmentNumber,
        installmentTotal: row.installmentTotal,
      }));
      month = cursor;
      while (month <= last) {
        for (const line of remainingInstallmentsForMonth(installmentTxs, month)) {
          if (inRange(line.dueDate, from, to)) {
            events.push({
              date: line.dueDate,
              name: line.name,
              amountCents: line.amountCents,
              kind: "credit_card",
            });
          }
        }
        month = addMonths(month, 1);
      }

      for (const bill of billRows) {
        if (inRange(bill.dueDate, from, to)) {
          events.push({
            date: bill.dueDate,
            name: "Fatura do cartão",
            amountCents: bill.totalCents,
            kind: "bill",
          });
        }
      }

      return events.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
    },
  );
};
