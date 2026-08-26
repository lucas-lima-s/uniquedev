import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardPage } from "../DashboardPage";

const dashboardFixture = {
  month: "2026-08-01",
  incomeCents: 1000000,
  realizedIncomeCents: 1000000,
  spentCents: 20000,
  committedCents: 250000,
  remainingCents: 730000,
  spentShare: { cents: 20000, pct: 2 },
  committedShare: { cents: 250000, pct: 25 },
  remainingShare: { cents: 730000, pct: 73 },
  byCategory: [
    {
      categoryId: null,
      name: "Alimentação",
      spent: { cents: 20000, pct: 100 },
      budgetCents: null,
      budgetUsedPct: null,
    },
  ],
  committed: [],
  accountsTotalCents: 500000,
  creditCardDebtCents: 0,
  investmentsTotalCents: 0,
};

function renderWithClient(ui: ReactNode) {
  const client = new QueryClient();
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("DashboardPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the five summary cards and the category table from a fixture", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => dashboardFixture }),
    );

    renderWithClient(<DashboardPage />);

    await waitFor(() => expect(screen.getByText("Alimentação")).toBeInTheDocument());

    expect(screen.getByText("Renda prevista")).toBeInTheDocument();
    expect(screen.getByText("Gasto no mês")).toBeInTheDocument();
    expect(screen.getByText("Comprometido")).toBeInTheDocument();
    expect(screen.getByText("Sobra")).toBeInTheDocument();
    expect(screen.getByText("Saldo em contas")).toBeInTheDocument();
  });
});
