import { describe, expect, it } from "vitest";
import { db } from "../src/db/client.js";
import { accounts, transactions, webhookEvents } from "../src/db/schema.js";
import { buildTestApp } from "./helpers/build.js";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET as string;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("POST /webhooks", () => {
  it("rejects a request carrying no valid secret", async () => {
    const app = buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/webhooks",
      payload: { event: "item/updated" },
    });
    expect(response.statusCode).toBe(401);
  });

  it("accepts the secret via the header and marks the event processed", async () => {
    const app = buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/webhooks",
      headers: { "x-webhook-secret": WEBHOOK_SECRET },
      payload: { event: "item/updated" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ received: true });

    await wait(50);
    const [row] = await db.select().from(webhookEvents).limit(1);
    expect(row?.status).toBe("processed");
  });

  it("accepts the secret via the ?token= query parameter", async () => {
    const app = buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: `/webhooks?token=${encodeURIComponent(WEBHOOK_SECRET)}`,
      payload: { event: "item/updated" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ received: true });
  });

  it("materialises accounts and transactions for a known mock item", async () => {
    const app = buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/webhooks",
      headers: { "x-webhook-secret": WEBHOOK_SECRET },
      payload: { event: "item/created", itemId: "mock-item-1" },
    });
    expect(response.statusCode).toBe(200);

    await wait(300);
    const accountRows = await db.select().from(accounts);
    const transactionRows = await db.select().from(transactions);
    expect(accountRows.length).toBeGreaterThan(0);
    expect(transactionRows.length).toBeGreaterThan(0);
  });
});
