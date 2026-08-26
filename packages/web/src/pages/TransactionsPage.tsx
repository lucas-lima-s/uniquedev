import { centsToBRL } from "@haven/shared";
import { useState } from "react";
import {
  useAccounts,
  useCategories,
  useTransactions,
  useUpdateTransactionCategory,
} from "../api/queries";

export function TransactionsPage() {
  const [accountId, setAccountId] = useState<string>("");
  const accounts = useAccounts();
  const categories = useCategories();
  const transactions = useTransactions(accountId || undefined);
  const updateCategory = useUpdateTransactionCategory();

  const categoryName = new Map((categories.data ?? []).map((c) => [c.id, c.name]));

  return (
    <section>
      <h1>Extrato</h1>
      <div className="form-row">
        <label>
          Conta
          <select value={accountId} onChange={(event) => setAccountId(event.target.value)}>
            <option value="">Todas</option>
            {(accounts.data ?? []).map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {transactions.isPending && <p>Carregando…</p>}
      {transactions.isError && <p>Falha ao carregar o extrato.</p>}
      {transactions.data && transactions.data.length === 0 && <p>Nenhuma transação.</p>}

      {transactions.data && transactions.data.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Descrição</th>
              <th>Categoria</th>
              <th className="num">Valor</th>
            </tr>
          </thead>
          <tbody>
            {transactions.data.map((tx) => (
              <tr key={tx.id} className={tx.isPending ? "pending" : undefined}>
                <td>{new Date(tx.date).toLocaleDateString("pt-BR")}</td>
                <td>
                  {tx.description}
                  {tx.installmentNumber && tx.installmentTotal && (
                    <span className="muted">
                      {" "}
                      {tx.installmentNumber}/{tx.installmentTotal}
                    </span>
                  )}
                </td>
                <td>
                  <select
                    value={tx.customCategoryId ?? ""}
                    onChange={(event) =>
                      updateCategory.mutate({
                        id: tx.id,
                        customCategoryId: event.target.value || null,
                      })
                    }
                  >
                    <option value="">{tx.pluggyCategory ?? "Sem categoria"}</option>
                    {(categories.data ?? []).map((category) => (
                      <option key={category.id} value={category.id}>
                        {categoryName.get(category.id)}
                      </option>
                    ))}
                  </select>
                </td>
                <td className={`num ${tx.amountCents < 0 ? "amount-negative" : "amount-positive"}`}>
                  {centsToBRL(tx.amountCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
