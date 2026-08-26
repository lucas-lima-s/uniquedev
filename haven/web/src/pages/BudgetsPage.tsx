import {
  addMonths,
  centsToBRL,
  monthLabel,
  monthStart,
  reaisToCents,
} from "@uniquedev/haven-shared";
import { useState } from "react";
import { useBudgets, useCategories, useCreateCategory, useUpsertBudget } from "../api/queries";

export function BudgetsPage() {
  const [month, setMonth] = useState(() => monthStart(new Date()));
  const [newCategory, setNewCategory] = useState("");
  const categories = useCategories();
  const budgets = useBudgets(month);
  const upsertBudget = useUpsertBudget();
  const createCategory = useCreateCategory();

  const limitByCategory = new Map((budgets.data ?? []).map((b) => [b.categoryId, b.limitCents]));
  const totalCents = (budgets.data ?? []).reduce((sum, b) => sum + b.limitCents, 0);

  return (
    <section>
      <h1>Orçamento</h1>
      <div className="form-row">
        <button type="button" onClick={() => setMonth(addMonths(month, -1))}>
          ‹
        </button>
        <strong>{monthLabel(month)}</strong>
        <button type="button" onClick={() => setMonth(addMonths(month, 1))}>
          ›
        </button>
        <span className="muted">Total planejado: {centsToBRL(totalCents)}</span>
      </div>

      <form
        className="form-row"
        onSubmit={(event) => {
          event.preventDefault();
          if (!newCategory.trim()) return;
          createCategory.mutate(
            { name: newCategory.trim() },
            { onSuccess: () => setNewCategory("") },
          );
        }}
      >
        <input
          placeholder="Nova categoria"
          value={newCategory}
          onChange={(event) => setNewCategory(event.target.value)}
        />
        <button type="submit" disabled={createCategory.isPending}>
          Adicionar
        </button>
      </form>

      {categories.isPending && <p>Carregando…</p>}
      {categories.data && categories.data.length === 0 && (
        <p>Crie categorias para definir limites mensais.</p>
      )}

      {categories.data && categories.data.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>Categoria</th>
              <th className="num">Limite (R$)</th>
            </tr>
          </thead>
          <tbody>
            {categories.data.map((category) => {
              const limitCents = limitByCategory.get(category.id) ?? 0;
              return (
                <tr key={category.id}>
                  <td>{category.name}</td>
                  <td className="num">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      defaultValue={(limitCents / 100).toFixed(2)}
                      key={`${category.id}-${month}-${limitCents}`}
                      onBlur={(event) => {
                        const next = reaisToCents(Number(event.target.value));
                        if (next !== limitCents) {
                          upsertBudget.mutate({ categoryId: category.id, month, limitCents: next });
                        }
                      }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
