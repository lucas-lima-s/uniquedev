import { createBrowserRouter } from "react-router";
import { AppLayout } from "./components/AppLayout";
import { AccountsPage } from "./pages/AccountsPage";
import { BudgetsPage } from "./pages/BudgetsPage";
import { ConnectPage } from "./pages/ConnectPage";
import { DashboardPage } from "./pages/DashboardPage";
import { InvestmentsPage } from "./pages/InvestmentsPage";
import { PurchasesPage } from "./pages/PurchasesPage";
import { RecurringPage } from "./pages/RecurringPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TransactionsPage } from "./pages/TransactionsPage";

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <AppLayout />,
      children: [
        { index: true, element: <DashboardPage /> },
        { path: "contas", element: <AccountsPage /> },
        { path: "extrato", element: <TransactionsPage /> },
        { path: "orcamento", element: <BudgetsPage /> },
        { path: "recorrentes", element: <RecurringPage /> },
        { path: "compras", element: <PurchasesPage /> },
        { path: "investimentos", element: <InvestmentsPage /> },
        { path: "conectar", element: <ConnectPage /> },
        { path: "configuracoes", element: <SettingsPage /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL },
);
