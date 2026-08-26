import { type AccountType, centsToBRL } from "@haven/shared";
import { useAccounts, useConnections } from "../api/queries";

const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  checking: "Conta corrente",
  savings: "Poupança",
  credit_card: "Cartão de crédito",
  investment: "Investimento",
};

export function AccountsPage() {
  const accounts = useAccounts();
  const connections = useConnections();

  if (accounts.isPending || connections.isPending) return <p>Carregando…</p>;
  if (accounts.isError || connections.isError) return <p>Falha ao carregar as contas.</p>;

  const institutionByConnection = new Map(
    connections.data.map((connection) => [connection.id, connection.institutionName]),
  );
  const totalCents = accounts.data
    .filter((account) => account.type !== "credit_card")
    .reduce((sum, account) => sum + account.balanceCents, 0);

  return (
    <section>
      <h1>Contas</h1>
      <p className="muted">Saldo disponível: {centsToBRL(totalCents)}</p>
      {accounts.data.length === 0 && <p>Nenhuma conta conectada ainda.</p>}
      <table className="table">
        <thead>
          <tr>
            <th>Instituição</th>
            <th>Conta</th>
            <th>Tipo</th>
            <th className="num">Saldo</th>
          </tr>
        </thead>
        <tbody>
          {accounts.data.map((account) => (
            <tr key={account.id}>
              <td>{institutionByConnection.get(account.connectionId) ?? "—"}</td>
              <td>{account.name}</td>
              <td>{ACCOUNT_TYPE_LABEL[account.type]}</td>
              <td className="num">{centsToBRL(account.balanceCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
