import {
  centsToBRL,
  monthlyEquivalentCents,
  type RecurringCadence,
  type RecurringEntry,
  type RecurringKind,
  reaisToCents,
  share,
  yearlyEquivalentCents,
} from "@uniquedev/haven-shared";
import { useState } from "react";
import {
  useCategories,
  useCreateRecurring,
  useDeleteRecurring,
  useRecurring,
} from "../api/queries";

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function dueLabel(entry: RecurringEntry): string {
  if (entry.cadence === "monthly") return `todo dia ${entry.dueDay}`;
  return `${entry.dueDay} de ${MONTHS[(entry.dueMonth ?? 1) - 1]}`;
}

export function RecurringPage() {
  const [cadence, setCadence] = useState<RecurringCadence>("monthly");
  const [kind, setKind] = useState<RecurringKind>("expense");
  const recurring = useRecurring();
  const categories = useCategories();
  const createRecurring = useCreateRecurring();
  const deleteRecurring = useDeleteRecurring();

  const entries = recurring.data ?? [];
  const incomes = entries.filter((entry) => entry.kind === "income");
  const expenses = entries.filter((entry) => entry.kind === "expense");
  const monthlyIncome = incomes.reduce((sum, e) => sum + monthlyEquivalentCents(e), 0);
  const monthlyExpenses = expenses.reduce((sum, e) => sum + monthlyEquivalentCents(e), 0);
  const leftover = share(monthlyIncome - monthlyExpenses, monthlyIncome);
  const categoryName = new Map((categories.data ?? []).map((c) => [c.id, c.name]));

  function renderTable(rows: RecurringEntry[]) {
    if (rows.length === 0) return <p className="muted">Nada cadastrado.</p>;
    return (
      <table className="table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Quando</th>
            <th>Categoria</th>
            <th className="num">Valor</th>
            <th className="num">Por mês</th>
            <th className="num">Por ano</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((entry) => (
            <tr key={entry.id}>
              <td>
                {entry.name}
                {entry.cadence === "yearly" && <span className="badge">anual</span>}
              </td>
              <td>{dueLabel(entry)}</td>
              <td>{entry.categoryId ? (categoryName.get(entry.categoryId) ?? "—") : "—"}</td>
              <td className="num">{centsToBRL(entry.amountCents)}</td>
              <td className="num">{centsToBRL(monthlyEquivalentCents(entry))}</td>
              <td className="num">{centsToBRL(yearlyEquivalentCents(entry))}</td>
              <td className="num">
                <button
                  type="button"
                  disabled={deleteRecurring.isPending}
                  onClick={() => deleteRecurring.mutate(entry.id)}
                >
                  Remover
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <section>
      <h1>Recorrentes</h1>

      <div className="cards">
        <div className="card">
          <span className="card-label">Renda mensal</span>
          <span className="card-value">{centsToBRL(monthlyIncome)}</span>
        </div>
        <div className="card">
          <span className="card-label">Gastos fixos por mês</span>
          <span className="card-value">{centsToBRL(monthlyExpenses)}</span>
          <span className="card-sub">inclui a fatia mensal dos gastos anuais</span>
        </div>
        <div className="card">
          <span className="card-label">Sobra estimada</span>
          <span className={`card-value ${leftover.cents < 0 ? "amount-negative" : ""}`}>
            {centsToBRL(leftover.cents)}
          </span>
          <span className="card-sub">{leftover.pct}% da renda</span>
        </div>
      </div>

      <form
        className="form-grid"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          createRecurring.mutate(
            {
              kind,
              name: String(data.get("name") ?? ""),
              amountCents: reaisToCents(Number(data.get("amount") ?? 0)),
              cadence,
              dueDay: Number(data.get("dueDay") ?? 1),
              dueMonth: cadence === "yearly" ? Number(data.get("dueMonth") ?? 1) : null,
              categoryId: String(data.get("categoryId") ?? "") || null,
              activeFrom: String(data.get("activeFrom") ?? today()),
            },
            { onSuccess: () => form.reset() },
          );
        }}
      >
        <label>
          Tipo
          <select value={kind} onChange={(event) => setKind(event.target.value as RecurringKind)}>
            <option value="expense">Gasto</option>
            <option value="income">Renda (salário, extras)</option>
          </select>
        </label>
        <label>
          Nome
          <input name="name" required placeholder="Ex.: Salário, Aluguel, IPVA" />
        </label>
        <label>
          Valor (R$)
          <input name="amount" type="number" min="0.01" step="0.01" required />
        </label>
        <label>
          Frequência
          <select
            value={cadence}
            onChange={(event) => setCadence(event.target.value as RecurringCadence)}
          >
            <option value="monthly">Mensal</option>
            <option value="yearly">Anual</option>
          </select>
        </label>
        <label>
          Dia
          <input name="dueDay" type="number" min={1} max={31} defaultValue={5} required />
        </label>
        {cadence === "yearly" && (
          <label>
            Mês
            <select name="dueMonth" defaultValue={1}>
              {MONTHS.map((label, index) => (
                <option key={label} value={index + 1}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Categoria
          <select name="categoryId" defaultValue="">
            <option value="">—</option>
            {(categories.data ?? []).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Desde
          <input name="activeFrom" type="date" defaultValue={today()} required />
        </label>
        <button type="submit" disabled={createRecurring.isPending}>
          Adicionar
        </button>
      </form>
      {createRecurring.isError && <p className="amount-negative">Não foi possível salvar.</p>}

      <h2>Renda</h2>
      {renderTable(incomes)}

      <h2>Gastos recorrentes</h2>
      {renderTable(expenses)}
    </section>
  );
}
