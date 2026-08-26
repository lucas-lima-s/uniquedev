import { useState } from "react";
import { PluggyConnect } from "react-pluggy-connect";
import {
  useConnections,
  useConnectToken,
  useHealth,
  useRegisterConnection,
  useSyncConnection,
} from "../api/queries";

const STATUS_LABEL: Record<string, string> = {
  UPDATED: "Atualizada",
  UPDATING: "Atualizando",
  WAITING_USER_INPUT: "Aguardando você",
  WAITING_USER_ACTION: "Aguardando ação",
  MERGING: "Processando",
  LOGIN_ERROR: "Consentimento expirado",
  OUTDATED: "Falha na última sincronização",
};

export function ConnectPage() {
  const [token, setToken] = useState<string | null>(null);
  const health = useHealth();
  const connections = useConnections();
  const connectToken = useConnectToken();
  const registerConnection = useRegisterConnection();
  const syncConnection = useSyncConnection();
  const isDemoMode = health.data?.provider === "mock";

  return (
    <section>
      <h1>Conectar banco</h1>
      <p className="muted">
        A conexão acontece pelo Open Finance: você autoriza no app do próprio banco e o Haven recebe
        apenas saldos e extratos.
      </p>

      {isDemoMode ? (
        <div className="form-row">
          <span className="muted">
            Modo demonstração: os dados vêm de um provedor sintético, sem conta bancária real.
          </span>
          <button
            type="button"
            disabled={registerConnection.isPending}
            onClick={() => registerConnection.mutate("mock-item-1")}
          >
            {registerConnection.isPending ? "Conectando…" : "Conectar banco de demonstração"}
          </button>
        </div>
      ) : (
        <div className="form-row">
          <button
            type="button"
            disabled={connectToken.isPending}
            onClick={() =>
              connectToken.mutate(undefined, { onSuccess: (data) => setToken(data.accessToken) })
            }
          >
            {connectToken.isPending ? "Preparando…" : "Conectar novo banco"}
          </button>
          {connectToken.isError && (
            <span className="muted">Não foi possível iniciar a conexão.</span>
          )}
          {registerConnection.isPending && <span className="muted">Sincronizando…</span>}
        </div>
      )}

      {token && !isDemoMode && (
        <PluggyConnect
          connectToken={token}
          language="pt"
          theme="dark"
          onSuccess={({ item }) => {
            registerConnection.mutate(item.id);
            setToken(null);
          }}
          onError={() => setToken(null)}
          onClose={() => setToken(null)}
        />
      )}

      <h2>Conexões</h2>
      {connections.isPending && <p>Carregando…</p>}
      {connections.data && connections.data.length === 0 && <p>Nenhum banco conectado.</p>}
      {connections.data && connections.data.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>Instituição</th>
              <th>Status</th>
              <th>Última sincronização</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {connections.data.map((connection) => (
              <tr key={connection.id}>
                <td>{connection.institutionName}</td>
                <td>{STATUS_LABEL[connection.status] ?? connection.status}</td>
                <td>
                  {connection.lastSyncedAt
                    ? new Date(connection.lastSyncedAt).toLocaleString("pt-BR")
                    : "—"}
                </td>
                <td className="num">
                  <button
                    type="button"
                    disabled={syncConnection.isPending}
                    onClick={() => syncConnection.mutate(connection.id)}
                  >
                    Sincronizar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
