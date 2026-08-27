import { describe, expect, it } from "vitest";
import { db } from "../src/db/client.js";
import { creditCardBills } from "../src/db/schema.js";
import { buildTestApp } from "./helpers/build.js";

describe("credit card bills and calendar", () => {
  it("syncs mock bills and lists remaining installments on the calendar", async () => {
    const app = buildTestApp();
    const registered = await app.inject({
      method: "POST",
      url: "/connections",
      payload: { itemId: "mock-item-1" },
    });
    expect(registered.statusCode).toBe(200);

    const bills = await db.select().from(creditCardBills);
    expect(bills.length).toBeGreaterThan(0);

    const calendar = await app.inject({
      method: "GET",
      url: "/calendar?from=2026-08-01&to=2026-10-31",
    });
    expect(calendar.statusCode).toBe(200);
    const events = calendar.json() as { kind: string }[];
    expect(events.some((event) => event.kind === "bill" || event.kind === "credit_card")).toBe(
      true,
    );
  });
});
