import { describe, expect, it } from "vitest";
import { buildTestApp } from "./helpers/build.js";

const BASE = {
  name: "Notebook",
  totalCents: 300000,
  plannedDate: "2026-09-15",
  paymentMode: "cash" as const,
};

describe("planned purchases", () => {
  it("creates a purchase in draft status", async () => {
    const app = buildTestApp();
    const created = await app.inject({ method: "POST", url: "/purchases", payload: BASE });
    expect(created.statusCode).toBe(201);
    expect(created.json().status).toBe("draft");
  });

  it("moves a purchase through approve then mark-purchased", async () => {
    const app = buildTestApp();
    const created = await app.inject({ method: "POST", url: "/purchases", payload: BASE });
    const { id } = created.json();

    const approved = await app.inject({ method: "POST", url: `/purchases/${id}/approve` });
    expect(approved.json().status).toBe("approved");

    const purchased = await app.inject({ method: "POST", url: `/purchases/${id}/mark-purchased` });
    expect(purchased.json().status).toBe("purchased");
  });

  it("rejects an invalid state transition with 409", async () => {
    const app = buildTestApp();
    const created = await app.inject({ method: "POST", url: "/purchases", payload: BASE });
    const { id } = created.json();

    const response = await app.inject({ method: "POST", url: `/purchases/${id}/mark-purchased` });
    expect(response.statusCode).toBe(409);
    expect(response.json().error).toBe("cannot_mark-purchased_from_draft");
  });

  it("returns 404 approving an unknown purchase", async () => {
    const app = buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/purchases/00000000-0000-4000-8000-000000000000/approve",
    });
    expect(response.statusCode).toBe(404);
  });
});
