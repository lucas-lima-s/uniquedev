import { reaisToCents } from "@haven/shared";
import {
  useConnections,
  useHealth,
  useMe,
  useSettings,
  useSyncConnection,
  useTriggerSnapshot,
  useUpdateSettings,
} from "../api/queries";

const PROVIDER_LABEL: Record<string, string> = {
  pluggy: "Pluggy (dados reais)",
  mock: "Demonstração (dados sintéticos)",
};

export function SettingsPage() {
  const me = useMe();
  const health = useHealth();
  const connections = useConnections();
  const syncConnection = useSyncConnection();
  const snapshot = useTriggerSnapshot();
  const settings = useSettings();
  const updateSettings = useUpdateSettings();

  return (
    <section>
      <h1>Configurações</h1>

      <h2>Identidade</h2>
      {me.isPending && <p>Carregando…</p>}
      {me.data && (
        <p className="muted">
          Conectado como <strong>{me.data.email || me.data.sub}</strong>
        </p>
      )}

      <h2>Conexões</h2>
      {connections.isPending && <p>Carregando…</p>}
      {connections.data && connections.data.length === 0 && (
        <p className="muted">Nenhum banco conectado.</p>
      )}
      {connections.data && connections.data.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>Instituição</th>
              <th>Última sincronização</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {connections.data.map((connection) => (
              <tr key={connection.id}>
                <td>{connection.institutionName}</td>
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

      <h2>Reserva de emergência</h2>
      <form
        className="form-row"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          updateSettings.mutate({
            emergencyFundMonths: Number(data.get("emergencyFundMonths") ?? 6),
          });
        }}
      >
        <label>
          Meses de gastos recorrentes
          <input
            name="emergencyFundMonths"
            type="number"
            min={1}
            max={36}
            defaultValue={settings.data?.emergencyFundMonths ?? 6}
            key={settings.data?.emergencyFundMonths ?? "pending"}
          />
        </label>
        <button type="submit" disabled={updateSettings.isPending}>
          Salvar
        </button>
      </form>

      <h2>Alertas</h2>
      <p className="muted">
        O destino (webhook ou Telegram) é configurado só no servidor, via variáveis de ambiente.
      </p>
      <form
        className="form-row"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          updateSettings.mutate({
            alertsEnabled: data.get("alertsEnabled") === "on",
            largeTransactionThresholdCents: reaisToCents(
              Number(data.get("largeThreshold") ?? 1000),
            ),
          });
        }}
      >
        <label>
          <input
            name="alertsEnabled"
            type="checkbox"
            defaultChecked={settings.data?.alertsEnabled ?? false}
            key={`alerts-${settings.data?.alertsEnabled ?? "pending"}`}
          />
          Enviar alertas
        </label>
        <label>
          Transação grande a partir de (R$)
          <input
            name="largeThreshold"
            type="number"
            min="0.01"
            step="0.01"
            defaultValue={
              settings.data
                ? (settings.data.largeTransactionThresholdCents / 100).toFixed(2)
                : "1000"
            }
            key={settings.data?.largeTransactionThresholdCents ?? "pending"}
          />
        </label>
        <button type="submit" disabled={updateSettings.isPending}>
          Salvar alertas
        </button>
      </form>

      <h2>Investimentos</h2>
      <div className="form-row">
        <button type="button" disabled={snapshot.isPending} onClick={() => snapshot.mutate()}>
          {snapshot.isPending ? "Registrando…" : "Registrar snapshot de investimentos agora"}
        </button>
        {snapshot.isSuccess && (
          <span className="muted">{snapshot.data.assets} ativo(s) registrados.</span>
        )}
      </div>

      <h2>Sobre</h2>
      <p className="muted">
        Versão {__APP_VERSION__}
        {health.data && (
          <> · Provedor de dados: {PROVIDER_LABEL[health.data.provider] ?? health.data.provider}</>
        )}
      </p>
    </section>
  );
}
