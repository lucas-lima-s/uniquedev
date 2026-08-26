export interface ProviderItem {
  id: string;
  connectorName: string;
  status: string;
}

export interface ProviderAccount {
  id: string;
  name: string;
  type: string;
  subtype: string | null;
  balance: number;
}

export interface ProviderCreditCardMetadata {
  installmentNumber: number | null;
  totalInstallments: number | null;
}

export interface ProviderTransaction {
  id: string;
  description: string;
  amount: number;
  type: "DEBIT" | "CREDIT";
  date: string;
  category: string | null;
  status: string;
  creditCardMetadata: ProviderCreditCardMetadata;
}

export interface ProviderInvestment {
  id: string;
  name: string;
  type: string;
  subtype: string | null;
  balance: number;
  amountOriginal: number | null;
}

export interface FetchTransactionsOptions {
  dateFrom?: string;
}

export interface BankDataProvider {
  createConnectToken(webhookUrl?: string): Promise<{ accessToken: string }>;
  fetchItem(itemId: string): Promise<ProviderItem>;
  fetchAccounts(itemId: string): Promise<ProviderAccount[]>;
  fetchTransactions(
    accountId: string,
    options?: FetchTransactionsOptions,
  ): Promise<ProviderTransaction[]>;
  fetchInvestments(itemId: string): Promise<ProviderInvestment[]>;
}
