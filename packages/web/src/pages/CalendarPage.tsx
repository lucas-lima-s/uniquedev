import { type CalendarEvent, centsToBRL } from "@haven/shared";
import { useCalendar } from "../api/queries";

const KIND_LABEL: Record<CalendarEvent["kind"], string> = {
  recurring: "Recorrente",
  purchase: "Compra",
  credit_card: "Parcela",
  bill: "Fatura",
};

function dateWindow(): { from: string; to: string } {
  const fromDate = new Date();
  const toDate = new Date();
  toDate.setUTCDate(toDate.getUTCDate() + 30);
  return {
    from: fromDate.toISOString().slice(0, 10),
    to: toDate.toISOString().slice(0, 10),
  };
}

export function CalendarPage() {
  const range = dateWindow();
  const calendar = useCalendar(range.from, range.to);

  return (
    <section>
      <h1>Calendário</h1>
      <p className="muted">Próximos 30 dias: recorrentes, compras, parcelas e faturas.</p>
      {calendar.isPending && <p>Carregando…</p>}
      {calendar.isError && <p>Falha ao carregar o calendário.</p>}
      {calendar.data && calendar.data.length === 0 && <p className="muted">Nada a vencer.</p>}
      {calendar.data && calendar.data.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>O quê</th>
              <th className="num">Valor</th>
            </tr>
          </thead>
          <tbody>
            {calendar.data.map((event) => (
              <tr key={`${event.kind}-${event.date}-${event.name}`}>
                <td>{new Date(`${event.date}T12:00:00`).toLocaleDateString("pt-BR")}</td>
                <td>{KIND_LABEL[event.kind]}</td>
                <td>{event.name}</td>
                <td className="num">{centsToBRL(event.amountCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
