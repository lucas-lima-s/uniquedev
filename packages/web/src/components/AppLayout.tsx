import { NavLink, Outlet } from "react-router";

const NAV_ITEMS = [
  { to: "/", label: "Painel", end: true },
  { to: "/contas", label: "Contas" },
  { to: "/extrato", label: "Extrato" },
  { to: "/orcamento", label: "Orçamento" },
  { to: "/recorrentes", label: "Recorrentes" },
  { to: "/compras", label: "Compras" },
  { to: "/metas", label: "Metas" },
  { to: "/calendario", label: "Calendário" },
  { to: "/investimentos", label: "Investimentos" },
  { to: "/conectar", label: "Conectar" },
  { to: "/configuracoes", label: "Configurações" },
];

export function AppLayout() {
  return (
    <div className="app-shell">
      <header className="app-brand">Haven</header>
      <nav className="app-nav">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end}>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
