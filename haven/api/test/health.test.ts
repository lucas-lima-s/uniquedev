import { describe, expect, it } from "vitest";
import { buildTestApp } from "./helpers/build.js";

describe("GET /health", () => {
  it("reports ok status and the active data provider", async () => {
    const app = buildTestApp();
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok", provider: "mock" });
  });
});
