import { type AssetType, centsToBRL, reaisToCents } from "@uniquedev/haven-shared";
import { useState } from "react";
import {
  Area,
  AreaChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  useCreateInvestment,
  useDeleteInvestment,
  useInvestmentHistory,
  useInvestments,
  useUpdateInvestment,
} from "../api/queries";

const ASSET_TYPE_LABEL: Record<AssetType, string> = {
  fixed_income: "Renda fixa",
  stocks: "Ações",
  funds: "Fundos",
  pension: "Previdência",
  crypto: "Cripto",
  other: "Outros",
};

const PALETTE = ["#60a5fa", "#34d399", "#fbbf24", "#a78bfa", "#f472b6", "#fb923c"];

function formatCents(value: unknown): string {
  return centsToBRL(Number(value ?? 0));
}

function gainClass(cents: number): string {
  if (cents > 0) return "amount-positive";
  if (cents < 0) return "amount-negative";
  return "";
}

export function InvestmentsPage() {
  const [months, setMonths] = useState(12);
  const investments = useInvestments();
  const history = useInvestmentHistory(months);
  const createInvestment = useCreateInvestment();
  const updateInvestment = useUpdateInvestment();
  const deleteInvestment = useDeleteInvestment();

  const summary = investments.data;

  return (
    <section>
      <h1>Investimentos</h1>

      {investments.isPending && <p>Carregando…</p>}
      {investments.isError && <p>Não foi possível carregar a carteira.</p>}

      {summary && (
        <>
          <div className="cards">
            <div className="card">
              <span className="card-label">Patrimônio investido</span>
              <span className="card-value">{centsToBRL(summary.totalValueCents)}</span>
              <span className="card-sub">custo: {centsToBRL(summary.totalInvestedCents)}</span>
            </div>
            <div className="card">
              <span className="card-label">Rendimento</span>
              <span className={`card-value ${gainClass(summary.gain.cents)}`}>
                {centsToBRL(summary.gain.cents)}
              </span>
              <span className="card-sub">{summary.gain.pct}% sobre o custo</span>
            </div>
            {summary.byType.map((entry) => (
              <div className="card" key={entry.assetType}>
                <span className="card-label">{ASSET_TYPE_LABEL[entry.assetType]}</span>
                <span className="card-value">{centsToBRL(entry.value.cents)}</span>
                <span className="card-sub">
                  {entry.value.pct}% da carteira ·{" "}
                  <span className={gainClass(entry.gain.cents)}>
                    {entry.gain.pct}% ({centsToBRL(entry.gain.cents)})
                  </span>
                </span>
              </div>
            ))}
          </div>

          <div className="chart-grid">
            <div className="card">
              <span className="card-label">Alocação</span>
              {summary.byType.length === 0 ? (
                <p className="muted">Nenhum ativo cadastrado.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={summary.byType.map((entry) => ({
                        name: ASSET_TYPE_LABEL[entry.assetType],
                        value: entry.value.cents,
                      }))}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                    >
                      {summary.byType.map((entry, index) => (
                        <Cell key={entry.assetType} fill={PALETTE[index % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={formatCents} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card">
              <div className="form-row" style={{ margin: 0 }}>
                <span className="card-label">Evolução</span>
                <select value={months} onChange={(event) => setMonths(Number(event.target.value))}>
                  <option value={3}>3 meses</option>
                  <option value={6}>6 meses</option>
                  <option value={12}>12 meses</option>
                  <option value={36}>3 anos</option>
                </select>
              </div>
              {history.data && history.data.length === 0 && (
                <p className="muted">Ainda sem histórico. Um snapshot é gravado por dia.</p>
              )}
              {history.data && history.data.length > 0 && (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={history.data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value: string) =>
                        new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", {
                          month: "short",
                          day: "2-digit",
                        })
                      }
                      stroke="#9ca3af"
                    />
                    <YAxis hide />
                    <Tooltip formatter={formatCents} />
                    <Area
                      type="monotone"
                      dataKey="investedCents"
                      name="Custo"
                      stroke="#9ca3af"
                      fill="#27272a"
                    />
                    <Area
                      type="monotone"
                      dataKey="valueCents"
                      name="Valor"
                      stroke="#60a5fa"
                      fill="#1e3a5f"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const data = new FormData(form);
              createInvestment.mutate(
                {
                  name: String(data.get("name") ?? ""),
                  assetType: String(data.get("assetType") ?? "other") as AssetType,
                  investedCents: reaisToCents(Number(data.get("invested") ?? 0)),
                  currentValueCents: reaisToCents(Number(data.get("currentValue") ?? 0)),
                },
                { onSuccess: () => form.reset() },
              );
            }}
          >
            <label>
              Ativo (manual)
              <input name="name" required placeholder="Ex.: Tesouro IPCA 2035" />
            </label>
            <label>
              Tipo
              <select name="assetType" defaultValue="fixed_income">
                {Object.entries(ASSET_TYPE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Valor investido (R$)
              <input name="invested" type="number" min={0} step="0.01" required />
            </label>
            <label>
              Valor atual (R$)
              <input name="currentValue" type="number" min={0} step="0.01" required />
            </label>
            <button type="submit" disabled={createInvestment.isPending}>
              Adicionar
            </button>
          </form>

          {summary.assets.length > 0 && (
            <table className="table">
              <thead>
                <tr>
                  <th>Ativo</th>
                  <th>Tipo</th>
                  <th>Origem</th>
                  <th className="num">Investido</th>
                  <th className="num">Valor atual</th>
                  <th className="num">Rendimento</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {summary.assets.map((asset) => {
                  const gainCents = asset.currentValueCents - asset.investedCents;
                  const gainPct =
                    asset.investedCents > 0
                      ? Math.round((gainCents / asset.investedCents) * 10000) / 100
                      : 0;
                  return (
                    <tr key={asset.id}>
                      <td>{asset.name}</td>
                      <td>{ASSET_TYPE_LABEL[asset.assetType]}</td>
                      <td>{asset.source === "pluggy" ? "Open Finance" : "Manual"}</td>
                      <td className="num">{centsToBRL(asset.investedCents)}</td>
                      <td className="num">
                        {asset.source === "manual" ? (
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            key={`${asset.id}-${asset.currentValueCents}`}
                            defaultValue={(asset.currentValueCents / 100).toFixed(2)}
                            onBlur={(event) => {
                              const next = reaisToCents(Number(event.target.value));
                              if (next !== asset.currentValueCents) {
                                updateInvestment.mutate({ id: asset.id, currentValueCents: next });
                              }
                            }}
                          />
                        ) : (
                          centsToBRL(asset.currentValueCents)
                        )}
                      </td>
                      <td className={`num ${gainClass(gainCents)}`}>
                        {centsToBRL(gainCents)} ({gainPct}%)
                      </td>
                      <td className="num">
                        {asset.source === "manual" && (
                          <button
                            type="button"
                            disabled={deleteInvestment.isPending}
                            onClick={() => deleteInvestment.mutate(asset.id)}
                          >
                            Remover
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  );
}
