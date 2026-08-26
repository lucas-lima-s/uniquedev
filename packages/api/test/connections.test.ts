import { describe, expect, it } from "vitest";
import { buildTestApp } from "./helpers/build.js";

describe("connections", () => {
  it("issues a connect token in mock mode", async () => {
    const app = buildTestApp();
    const response = await app.inject({ method: "POST", url: "/connections/token" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveProperty("accessToken");
  });

  it("returns 404 syncing an unknown connection id", async () => {
    const app = buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/connections/00000000-0000-4000-8000-000000000000/sync",
    });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "connection_not_found" });
  });

  it("registers a mock connection end-to-end", async () => {
    const app = buildTestApp();
    const registered = await app.inject({
      method: "POST",
      url: "/connections",
      payload: { itemId: "mock-item-1" },
    });
    expect(registered.statusCode).toBe(200);

    const list = await app.inject({ method: "GET", url: "/connections" });
    expect(list.json()).toHaveLength(1);
  });
});
