import { describe, expect, it } from "vitest";
import { buildTestApp } from "./helpers/build.js";

describe("goals and settings", () => {
  it("stores emergency fund months and computes the target from recurring expenses", async () => {
    const app = buildTestApp();
    await app.inject({
      method: "POST",
      url: "/recurring",
      payload: {
        kind: "expense",
        name: "Aluguel",
        amountCents: 200000,
        cadence: "monthly",
        dueDay: 10,
        activeFrom: "2026-01-01",
      },
    });

    const patched = await app.inject({
      method: "PATCH",
      url: "/settings",
      payload: { emergencyFundMonths: 6 },
    });
    expect(patched.json().emergencyFundMonths).toBe(6);

    const created = await app.inject({
      method: "POST",
      url: "/goals",
      payload: { name: "Reserva", kind: "emergency_fund" },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().targetCents).toBe(1200000);
  });

  it("records a manual contribution and suppresses the planned monthly line", async () => {
    const app = buildTestApp();
    const created = await app.inject({
      method: "POST",
      url: "/goals",
      payload: {
        name: "Viagem",
        kind: "goal",
        targetCents: 300000,
        plannedMonthlyCents: 50000,
      },
    });
    const { id } = created.json();

    const contributed = await app.inject({
      method: "POST",
      url: `/goals/${id}/contributions`,
      payload: { amountCents: 50000, date: "2026-08-12" },
    });
    expect(contributed.statusCode).toBe(201);

    const listed = await app.inject({ method: "GET", url: "/goals" });
    expect(listed.json()[0].progressCents).toBe(50000);

    const dashboard = await app.inject({ method: "GET", url: "/dashboard?month=2026-08-01" });
    const committed = dashboard.json().committed as { source: string }[];
    expect(committed.find((line) => line.source === "goal")).toBeUndefined();
  });
});
