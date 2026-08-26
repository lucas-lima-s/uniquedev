import type {
  Account,
  BankConnection,
  Budget,
  Category,
  CreateInvestmentAssetInput,
  CreatePlannedPurchaseInput,
  CreateRecurringEntryInput,
  Dashboard,
  InvestmentAsset,
  InvestmentHistoryPoint,
  InvestmentsSummary,
  PlannedPurchase,
  PurchaseTransition,
  RecurringEntry,
  Transaction,
  UpdateInvestmentAssetInput,
  UpdatePlannedPurchaseInput,
  UpdateRecurringEntryInput,
} from "@haven/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";

export const queryKeys = {
  health: ["health"] as const,
  connections: ["connections"] as const,
  accounts: ["accounts"] as const,
  transactions: (accountId?: string) => ["transactions", accountId ?? "all"] as const,
  categories: ["categories"] as const,
  budgets: (month: string) => ["budgets", month] as const,
  recurring: ["recurring"] as const,
  purchases: ["purchases"] as const,
  dashboard: (month: string) => ["dashboard", month] as const,
  investments: ["investments"] as const,
  investmentHistory: (months: number) => ["investments", "history", months] as const,
};

export interface Health {
  status: "ok";
  provider: "pluggy" | "mock";
}

export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: () => apiFetch<Health>("/health"),
  });
}

export function useInvestments() {
  return useQuery({
    queryKey: queryKeys.investments,
    queryFn: () => apiFetch<InvestmentsSummary>("/investments"),
  });
}

export function useInvestmentHistory(months: number) {
  return useQuery({
    queryKey: queryKeys.investmentHistory(months),
    queryFn: () => apiFetch<InvestmentHistoryPoint[]>(`/investments/history?months=${months}`),
  });
}

function invalidateInvestments(client: ReturnType<typeof useQueryClient>) {
  void client.invalidateQueries({ queryKey: queryKeys.investments });
  void client.invalidateQueries({ queryKey: ["dashboard"] });
}

export function useCreateInvestment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInvestmentAssetInput) =>
      apiFetch<InvestmentAsset>("/investments", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => invalidateInvestments(client),
  });
}

export function useUpdateInvestment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string } & UpdateInvestmentAssetInput) => {
      const { id, ...body } = input;
      return apiFetch<InvestmentAsset>(`/investments/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => invalidateInvestments(client),
  });
}

export function useTriggerSnapshot() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<{ assets: number }>("/investments/snapshot", { method: "POST" }),
    onSuccess: () => invalidateInvestments(client),
  });
}

export function useDeleteInvestment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<null>(`/investments/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidateInvestments(client),
  });
}

function invalidatePlanning(client: ReturnType<typeof useQueryClient>) {
  void client.invalidateQueries({ queryKey: ["dashboard"] });
}

export function useDashboard(month: string) {
  return useQuery({
    queryKey: queryKeys.dashboard(month),
    queryFn: () => apiFetch<Dashboard>(`/dashboard?month=${month}`),
  });
}

export function useRecurring() {
  return useQuery({
    queryKey: queryKeys.recurring,
    queryFn: () => apiFetch<RecurringEntry[]>("/recurring"),
  });
}

export function useCreateRecurring() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRecurringEntryInput) =>
      apiFetch<RecurringEntry>("/recurring", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.recurring });
      invalidatePlanning(client);
    },
  });
}

export function useUpdateRecurring() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string } & UpdateRecurringEntryInput) => {
      const { id, ...body } = input;
      return apiFetch<RecurringEntry>(`/recurring/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.recurring });
      invalidatePlanning(client);
    },
  });
}

export function useDeleteRecurring() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<null>(`/recurring/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.recurring });
      invalidatePlanning(client);
    },
  });
}

export function usePurchases() {
  return useQuery({
    queryKey: queryKeys.purchases,
    queryFn: () => apiFetch<PlannedPurchase[]>("/purchases"),
  });
}

export function useCreatePurchase() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePlannedPurchaseInput) =>
      apiFetch<PlannedPurchase>("/purchases", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.purchases });
      invalidatePlanning(client);
    },
  });
}

export function useUpdatePurchase() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string } & UpdatePlannedPurchaseInput) => {
      const { id, ...body } = input;
      return apiFetch<PlannedPurchase>(`/purchases/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.purchases });
      invalidatePlanning(client);
    },
  });
}

export function useTransitionPurchase() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; transition: PurchaseTransition }) =>
      apiFetch<PlannedPurchase>(`/purchases/${input.id}/${input.transition}`, { method: "POST" }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.purchases });
      invalidatePlanning(client);
    },
  });
}

export function useLinkTransaction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      recurringEntryId?: string | null;
      plannedPurchaseId?: string | null;
    }) => {
      const { id, ...body } = input;
      return apiFetch<Transaction>(`/transactions/${id}/link`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["transactions"] });
      invalidatePlanning(client);
    },
  });
}

export interface Identity {
  email: string;
  sub: string;
}

export function useMe() {
  return useQuery({
    queryKey: ["me"] as const,
    queryFn: () => apiFetch<Identity>("/me"),
  });
}

export function useConnections() {
  return useQuery({
    queryKey: queryKeys.connections,
    queryFn: () => apiFetch<BankConnection[]>("/connections"),
  });
}

export function useAccounts() {
  return useQuery({
    queryKey: queryKeys.accounts,
    queryFn: () => apiFetch<Account[]>("/accounts"),
  });
}

export function useTransactions(accountId?: string) {
  const search = accountId ? `?accountId=${encodeURIComponent(accountId)}` : "";
  return useQuery({
    queryKey: queryKeys.transactions(accountId),
    queryFn: () => apiFetch<Transaction[]>(`/transactions${search}`),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => apiFetch<Category[]>("/categories"),
  });
}

export function useBudgets(month: string) {
  return useQuery({
    queryKey: queryKeys.budgets(month),
    queryFn: () => apiFetch<Budget[]>(`/budgets?month=${month}`),
  });
}

export function useUpdateTransactionCategory() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; customCategoryId: string | null }) =>
      apiFetch<Transaction>(`/transactions/${input.id}/category`, {
        method: "PATCH",
        body: JSON.stringify({ customCategoryId: input.customCategoryId }),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["transactions"] }),
  });
}

export function useCreateCategory() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; parentId?: string | null }) =>
      apiFetch<Category>("/categories", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.categories }),
  });
}

export function useUpsertBudget() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { categoryId: string; month: string; limitCents: number }) =>
      apiFetch<Budget>("/budgets", { method: "PUT", body: JSON.stringify(input) }),
    onSuccess: (_budget, input) =>
      client.invalidateQueries({ queryKey: queryKeys.budgets(input.month) }),
  });
}

export function useConnectToken() {
  return useMutation({
    mutationFn: () => apiFetch<{ accessToken: string }>("/connections/token", { method: "POST" }),
  });
}

export function useSyncConnection() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<BankConnection>(`/connections/${id}/sync`, { method: "POST" }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.connections });
      void client.invalidateQueries({ queryKey: queryKeys.accounts });
      void client.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useRegisterConnection() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      apiFetch<{ ok: true }>("/connections", { method: "POST", body: JSON.stringify({ itemId }) }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.connections });
      void client.invalidateQueries({ queryKey: queryKeys.accounts });
      void client.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}
