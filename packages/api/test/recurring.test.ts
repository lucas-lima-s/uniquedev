import { describe, expect, it } from "vitest";
import { buildTestApp } from "./helpers/build.js";

const BASE = {
  kind: "expense",
  name: "Aluguel",
  amountCents: 200000,
  cadence: "monthly",
  dueDay: 10,
  activeFrom: "2026-01-01",
};

describe("recurring entries", () => {
  it("creates and lists recurring entries", async () => {
    const app = buildTestApp();
    const created = await app.inject({ method: "POST", url: "/recurring", payload: BASE });
    expect(created.statusCode).toBe(201);

    const list = await app.inject({ method: "GET", url: "/recurring" });
    expect(list.json()).toHaveLength(1);
  });

  it("requires dueMonth for a yearly cadence", async () => {
    const app = buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/recurring",
      payload: { ...BASE, cadence: "yearly" },
    });
    expect(response.statusCode).toBe(400);
  });

  it("updates a recurring entry", async () => {
    const app = buildTestApp();
    const created = await app.inject({ method: "POST", url: "/recurring", payload: BASE });
    const { id } = created.json();

    const updated = await app.inject({
      method: "PATCH",
      url: `/recurring/${id}`,
      payload: { amountCents: 250000 },
    });
    expect(updated.json().amountCents).toBe(250000);
  });

  it("deletes a recurring entry", async () => {
    const app = buildTestApp();
    const created = await app.inject({ method: "POST", url: "/recurring", payload: BASE });
    const { id } = created.json();

    const deleted = await app.inject({ method: "DELETE", url: `/recurring/${id}` });
    expect(deleted.statusCode).toBe(204);
  });
});
