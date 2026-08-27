import { centsToBRL, type GoalKind, reaisToCents } from "@haven/shared";
import { useState } from "react";
import {
  useAccounts,
  useCreateGoal,
  useCreateGoalContribution,
  useDeleteGoal,
  useGoals,
  useSettings,
} from "../api/queries";

function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function GoalsPage() {
  const [kind, setKind] = useState<GoalKind>("goal");
  const goals = useGoals();
  const settings = useSettings();
  const accounts = useAccounts();
  const createGoal = useCreateGoal();
  const createContribution = useCreateGoalContribution();
  const deleteGoal = useDeleteGoal();

  return (
    <section>
      <h1>Metas</h1>
      <p className="muted">
        A reserva de emergência usa {settings.data?.emergencyFundMonths ?? 6} meses de gastos
        recorrentes como alvo. Uma contribuição planejada por mês entra na projeção.
      </p>

      <form
        className="form-grid"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          const planned = Number(data.get("plannedMonthly") ?? 0);
          createGoal.mutate(
            {
              kind,
              name: String(data.get("name") ?? ""),
              targetCents: kind === "goal" ? reaisToCents(Number(data.get("target") ?? 0)) : 0,
              deadline: String(data.get("deadline") ?? "") || null,
              accountId: String(data.get("accountId") ?? "") || null,
              plannedMonthlyCents: planned > 0 ? reaisToCents(planned) : null,
            },
            { onSuccess: () => form.reset() },
          );
        }}
      >
        <label>
          Tipo
          <select value={kind} onChange={(event) => setKind(event.target.value as GoalKind)}>
            <option value="goal">Meta</option>
            <option value="emergency_fund">Reserva de emergência</option>
          </select>
        </label>
        <label>
          Nome
          <input name="name" required placeholder="Ex.: Reserva, Viagem" />
        </label>
        {kind === "goal" && (
          <label>
            Alvo (R$)
            <input name="target" type="number" min="0.01" step="0.01" required />
          </label>
        )}
        <label>
          Prazo
          <input name="deadline" type="date" />
        </label>
        <label>
          Conta vinculada
          <select name="accountId" defaultValue="">
            <option value="">—</option>
            {(accounts.data ?? []).map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Reserva mensal planejada (R$)
          <input name="plannedMonthly" type="number" min="0" step="0.01" />
        </label>
        <button type="submit" disabled={createGoal.isPending}>
          Adicionar
        </button>
      </form>

      {(goals.data ?? []).map((goal) => (
        <article key={goal.id} className="card" style={{ marginTop: "1rem" }}>
          <span className="card-label">
            {goal.kind === "emergency_fund" ? "Reserva de emergência" : "Meta"}
          </span>
          <span className="card-value">{goal.name}</span>
          <span className="card-sub">
            {centsToBRL(goal.progressCents)} de {centsToBRL(goal.targetCents)}
            {goal.deadline ? ` · até ${goal.deadline}` : ""}
          </span>
          <form
            className="form-row"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const data = new FormData(form);
              createContribution.mutate({
                goalId: goal.id,
                amountCents: reaisToCents(Number(data.get("amount") ?? 0)),
                date: String(data.get("date") ?? today()),
              });
              form.reset();
            }}
          >
            <label>
              Contribuição (R$)
              <input name="amount" type="number" min="0.01" step="0.01" required />
            </label>
            <label>
              Data
              <input name="date" type="date" defaultValue={today()} required />
            </label>
            <button type="submit" disabled={createContribution.isPending}>
              Registrar
            </button>
            <button type="button" onClick={() => deleteGoal.mutate(goal.id)}>
              Remover
            </button>
          </form>
        </article>
      ))}
    </section>
  );
}
