import { describe, expect, it } from "vitest";
import { buildTestApp } from "./helpers/build.js";

describe("budgets", () => {
  it("upserts on (category, month) and updates in place on a second PUT", async () => {
    const app = buildTestApp();
    const category = await app.inject({
      method: "POST",
      url: "/categories",
      payload: { name: "Mercado" },
    });
    const categoryId = category.json().id;
    const month = "2026-08-01";

    const first = await app.inject({
      method: "PUT",
      url: "/budgets",
      payload: { categoryId, month, limitCents: 50000 },
    });
    expect(first.statusCode).toBe(200);

    const second = await app.inject({
      method: "PUT",
      url: "/budgets",
      payload: { categoryId, month, limitCents: 70000 },
    });
    expect(second.statusCode).toBe(200);
    expect(second.json().limitCents).toBe(70000);

    const list = await app.inject({ method: "GET", url: `/budgets?month=${month}` });
    expect(list.json()).toHaveLength(1);
  });

  it("deletes a budget", async () => {
    const app = buildTestApp();
    const category = await app.inject({
      method: "POST",
      url: "/categories",
      payload: { name: "Transporte" },
    });
    const categoryId = category.json().id;
    const created = await app.inject({
      method: "PUT",
      url: "/budgets",
      payload: { categoryId, month: "2026-08-01", limitCents: 30000 },
    });
    const { id } = created.json();

    const deleted = await app.inject({ method: "DELETE", url: `/budgets/${id}` });
    expect(deleted.statusCode).toBe(204);
  });

  it("returns 404 deleting an unknown budget", async () => {
    const app = buildTestApp();
    const response = await app.inject({
      method: "DELETE",
      url: "/budgets/00000000-0000-4000-8000-000000000000",
    });
    expect(response.statusCode).toBe(404);
  });
});
