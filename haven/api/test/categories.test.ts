import { describe, expect, it } from "vitest";
import { buildTestApp } from "./helpers/build.js";

describe("categories", () => {
  it("creates and lists categories", async () => {
    const app = buildTestApp();
    const created = await app.inject({
      method: "POST",
      url: "/categories",
      payload: { name: "Mercado" },
    });
    expect(created.statusCode).toBe(201);

    const list = await app.inject({ method: "GET", url: "/categories" });
    expect(list.json()).toHaveLength(1);
  });

  it("updates a category name", async () => {
    const app = buildTestApp();
    const created = await app.inject({
      method: "POST",
      url: "/categories",
      payload: { name: "Lazer" },
    });
    const { id } = created.json();

    const updated = await app.inject({
      method: "PATCH",
      url: `/categories/${id}`,
      payload: { name: "Lazer e cultura" },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().name).toBe("Lazer e cultura");
  });

  it("returns 404 updating an unknown category", async () => {
    const app = buildTestApp();
    const response = await app.inject({
      method: "PATCH",
      url: "/categories/00000000-0000-4000-8000-000000000000",
      payload: { name: "x" },
    });
    expect(response.statusCode).toBe(404);
  });

  it("deletes a category", async () => {
    const app = buildTestApp();
    const created = await app.inject({
      method: "POST",
      url: "/categories",
      payload: { name: "Educação" },
    });
    const { id } = created.json();

    const deleted = await app.inject({ method: "DELETE", url: `/categories/${id}` });
    expect(deleted.statusCode).toBe(204);
  });
});
