import {
  centsToBRL,
  expandPlannedPurchase,
  type PaymentMode,
  type PlannedPurchase,
  type PurchaseStatus,
  reaisToCents,
} from "@haven/shared";
import { useState } from "react";
import {
  useCategories,
  useCreatePurchase,
  usePurchases,
  useTransitionPurchase,
} from "../api/queries";

const STATUS_LABEL: Record<PurchaseStatus, string> = {
  draft: "Em análise",
  approved: "Aprovada",
  purchased: "Comprada",
  cancelled: "Cancelada",
};

const STATUS_ORDER: PurchaseStatus[] = ["approved", "draft", "purchased", "cancelled"];

function paymentLabel(purchase: PlannedPurchase): string {
  if (purchase.paymentMode === "cash") return "À vista";
  const [first] = expandPlannedPurchase(purchase);
  return `${purchase.installmentsCount}x de ${centsToBRL(first?.amountCents ?? 0)}`;
}

export function PurchasesPage() {
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash");
  const purchases = usePurchases();
  const categories = useCategories();
  const createPurchase = useCreatePurchase();
  const transition = useTransitionPurchase();

  const categoryName = new Map((categories.data ?? []).map((c) => [c.id, c.name]));
  const grouped = STATUS_ORDER.map((status) => ({
    status,
    rows: (purchases.data ?? []).filter((purchase) => purchase.status === status),
  })).filter((group) => group.rows.length > 0);

  return (
    <section>
      <h1>Compras planejadas</h1>
      <p className="muted">
        Uma compra aprovada entra na projeção do mês (ou dos meses, se parcelada) antes de
        acontecer.
      </p>

      <form
        className="form-grid"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          createPurchase.mutate(
            {
              name: String(data.get("name") ?? ""),
              totalCents: reaisToCents(Number(data.get("total") ?? 0)),
              plannedDate: String(data.get("plannedDate") ?? ""),
              paymentMode,
              installmentsCount:
                paymentMode === "installments" ? Number(data.get("installmentsCount") ?? 2) : null,
              categoryId: String(data.get("categoryId") ?? "") || null,
              notes: String(data.get("notes") ?? "") || null,
            },
            { onSuccess: () => form.reset() },
          );
        }}
      >
        <label>
          O que
          <input name="name" required placeholder="Ex.: Notebook" />
        </label>
        <label>
          Valor total (R$)
          <input name="total" type="number" min="0.01" step="0.01" required />
        </label>
        <label>
          Data prevista
          <input name="plannedDate" type="date" required />
        </label>
        <label>
          Pagamento
          <select
            value={paymentMode}
            onChange={(event) => setPaymentMode(event.target.value as PaymentMode)}
          >
            <option value="cash">À vista</option>
            <option value="installments">Parcelado</option>
          </select>
        </label>
        {paymentMode === "installments" && (
          <label>
            Parcelas
            <input
              name="installmentsCount"
              type="number"
              min={2}
              max={60}
              defaultValue={3}
              required
            />
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
          Observações
          <input name="notes" placeholder="opcional" />
        </label>
        <button type="submit" disabled={createPurchase.isPending}>
          Planejar
        </button>
      </form>
      {createPurchase.isError && <p className="amount-negative">Não foi possível salvar.</p>}

      {purchases.isPending && <p>Carregando…</p>}
      {purchases.data && purchases.data.length === 0 && <p>Nenhuma compra planejada.</p>}

      {grouped.map((group) => (
        <div key={group.status}>
          <h2>{STATUS_LABEL[group.status]}</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Compra</th>
                <th>Quando</th>
                <th>Pagamento</th>
                <th>Categoria</th>
                <th className="num">Total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {group.rows.map((purchase) => (
                <tr key={purchase.id}>
                  <td>
                    {purchase.name}
                    {purchase.notes && <div className="muted">{purchase.notes}</div>}
                  </td>
                  <td>
                    {new Date(`${purchase.plannedDate}T12:00:00`).toLocaleDateString("pt-BR")}
                  </td>
                  <td>{paymentLabel(purchase)}</td>
                  <td>
                    {purchase.categoryId ? (categoryName.get(purchase.categoryId) ?? "—") : "—"}
                  </td>
                  <td className="num">{centsToBRL(purchase.totalCents)}</td>
                  <td className="num actions">
                    {purchase.status === "draft" && (
                      <button
                        type="button"
                        onClick={() =>
                          transition.mutate({ id: purchase.id, transition: "approve" })
                        }
                      >
                        Aprovar
                      </button>
                    )}
                    {purchase.status === "approved" && (
                      <button
                        type="button"
                        onClick={() =>
                          transition.mutate({ id: purchase.id, transition: "mark-purchased" })
                        }
                      >
                        Comprei
                      </button>
                    )}
                    {(purchase.status === "draft" || purchase.status === "approved") && (
                      <button
                        type="button"
                        onClick={() => transition.mutate({ id: purchase.id, transition: "cancel" })}
                      >
                        Cancelar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </section>
  );
}
