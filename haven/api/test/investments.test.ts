import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "../src/db/client.js";
import { investmentAssets, investmentSnapshots } from "../src/db/schema.js";
import { buildTestApp } from "./helpers/build.js";

describe("investments", () => {
  it("creates and patches a manual investment asset", async () => {
    const app = buildTestApp();
    const created = await app.inject({
      method: "POST",
      url: "/investments",
      payload: {
        name: "Tesouro Selic",
        assetType: "fixed_income",
        investedCents: 100000,
        currentValueCents: 105000,
      },
    });
    expect(created.statusCode).toBe(201);
    const { id } = created.json();

    const patched = await app.inject({
      method: "PATCH",
      url: `/investments/${id}`,
      payload: { currentValueCents: 110000 },
    });
    expect(patched.json().currentValueCents).toBe(110000);
  });

  it("refuses to delete a pluggy-sourced asset", async () => {
    const [asset] = await db
      .insert(investmentAssets)
      .values({
        name: "Fundo Sincronizado",
        assetType: "funds",
        source: "pluggy",
        pluggyInvestmentId: "ext-1",
        investedCents: 1000,
        currentValueCents: 1100,
      })
      .returning({ id: investmentAssets.id });

    const app = buildTestApp();
    const response = await app.inject({ method: "DELETE", url: `/investments/${asset!.id}` });
    expect(response.statusCode).toBe(409);
  });

  it("writes one snapshot row per asset even when triggered twice the same day", async () => {
    const app = buildTestApp();
    const created = await app.inject({
      method: "POST",
      url: "/investments",
      payload: {
        name: "CDB",
        assetType: "fixed_income",
        investedCents: 50000,
        currentValueCents: 52000,
      },
    });
    const { id } = created.json();

    await app.inject({ method: "POST", url: "/investments/snapshot" });
    await app.inject({ method: "POST", url: "/investments/snapshot" });

    const rows = await db
      .select()
      .from(investmentSnapshots)
      .where(eq(investmentSnapshots.assetId, id));
    expect(rows).toHaveLength(1);
  });
});
