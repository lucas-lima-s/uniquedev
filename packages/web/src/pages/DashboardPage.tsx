import { addMonths, centsToBRL, monthLabel, monthStart } from "@haven/shared";
import { useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDashboard } from "../api/queries";

const PALETTE = [
  "#60a5fa",
  "#f472b6",
  "#34d399",
  "#fbbf24",
  "#a78bfa",
  "#fb923c",
  "#2dd4bf",
  "#f87171",
];

function formatCents(value: unknown): string {
  return centsToBRL(Number(value ?? 0));
}

export function DashboardPage() {
  const [month, setMonth] = useState(() => monthStart(new Date()));
  const dashboard = useDashboard(month);

  return (
    <section>
      <div className="form-row">
        <h1 style={{ margin: 0 }}>Painel</h1>
        <button type="button" onClick={() => setMonth(addMonths(month, -1))}>
          ‹
        </button>
        <strong>{monthLabel(month)}</strong>
        <button type="button" onClick={() => setMonth(addMonths(month, 1))}>
          ›
        </button>
      </div>

      {dashboard.isPending && <p>Carregando…</p>}
      {dashboard.isError && <p>Não foi possível carregar o painel.</p>}

      {dashboard.data && (
        <>
          <div className="cards">
            <div className="card">
              <span className="card-label">Renda prevista</span>
              <span className="card-value">{centsToBRL(dashboard.data.incomeCents)}</span>
              <span className="card-sub">
                recebido: {centsToBRL(dashboard.data.realizedIncomeCents)}
              </span>
            </div>
            <div className="card">
              <span className="card-label">Gasto no mês</span>
              <span className="card-value amount-negative">
                {centsToBRL(dashboard.data.spentCents)}
              </span>
              <span className="card-sub">{dashboard.data.spentShare.pct}% da renda</span>
            </div>
            <div className="card">
              <span className="card-label">Comprometido</span>
              <span className="card-value">{centsToBRL(dashboard.data.committedCents)}</span>
              <span className="card-sub">
                {dashboard.data.committedShare.pct}% da renda, ainda não pago
              </span>
            </div>
            <div className="card">
              <span className="card-label">Sobra</span>
              <span
                className={`card-value ${dashboard.data.remainingCents < 0 ? "amount-negative" : "amount-positive"}`}
              >
                {centsToBRL(dashboard.data.remainingCents)}
              </span>
              <span className="card-sub">{dashboard.data.remainingShare.pct}% da renda</span>
            </div>
            <div className="card">
              <span className="card-label">Saldo em contas</span>
              <span className="card-value">{centsToBRL(dashboard.data.accountsTotalCents)}</span>
              <span className="card-sub">
                cartões: {centsToBRL(dashboard.data.creditCardDebtCents)}
              </span>
            </div>
          </div>

          <div className="chart-grid">
            <div className="card">
              <span className="card-label">Gasto x comprometido x sobra</span>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart
                  layout="vertical"
                  data={[
                    {
                      name: monthLabel(month),
                      spent: dashboard.data.spentCents,
                      committed: dashboard.data.committedCents,
                      remaining: Math.max(dashboard.data.remainingCents, 0),
                    },
                  ]}
                  margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
                >
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" hide />
                  <Tooltip formatter={formatCents} />
                  <Legend />
                  <Bar dataKey="spent" name="Gasto" stackId="month" fill="#f87171" />
                  <Bar dataKey="committed" name="Comprometido" stackId="month" fill="#fbbf24" />
                  <Bar dataKey="remaining" name="Sobra" stackId="month" fill="#4ade80" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <span className="card-label">Gastos por categoria</span>
              {dashboard.data.byCategory.length === 0 ? (
                <p className="muted">Sem gastos neste mês.</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={dashboard.data.byCategory}
                      dataKey="spent.cents"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                    >
                      {dashboard.data.byCategory.map((entry, index) => (
                        <Cell key={entry.name} fill={PALETTE[index % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={formatCents} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {dashboard.data.byCategory.length > 0 && (
            <table className="table">
              <thead>
                <tr>
                  <th>Categoria</th>
                  <th className="num">Gasto</th>
                  <th className="num">% do gasto</th>
                  <th className="num">Orçamento</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.data.byCategory.map((entry) => (
                  <tr key={`${entry.categoryId ?? "pluggy"}-${entry.name}`}>
                    <td>{entry.name}</td>
                    <td className="num">{centsToBRL(entry.spent.cents)}</td>
                    <td className="num">{entry.spent.pct}%</td>
                    <td className="num">
                      {entry.budgetCents !== null
                        ? `${centsToBRL(entry.budgetCents)} (${entry.budgetUsedPct ?? 0}%)`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h2>Compromissos do mês</h2>
          {dashboard.data.committed.length === 0 ? (
            <p className="muted">Nada pendente.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Vencimento</th>
                  <th>Compromisso</th>
                  <th className="num">Valor</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.data.committed.map((line) => (
                  <tr key={`${line.sourceId}-${line.dueDate}`}>
                    <td>{new Date(`${line.dueDate}T12:00:00`).toLocaleDateString("pt-BR")}</td>
                    <td>
                      {line.name}
                      {line.installmentLabel && (
                        <span className="badge">{line.installmentLabel}</span>
                      )}
                      {line.provision && <span className="badge">fatia anual</span>}
                    </td>
                    <td className="num">{centsToBRL(line.amountCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  );
}
