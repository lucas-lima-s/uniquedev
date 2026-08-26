import type {
  Account as PluggyAccountDto,
  Investment as PluggyInvestmentDto,
  Transaction as PluggyTransactionDto,
} from "pluggy-sdk";
import { PluggyClient } from "pluggy-sdk";
import { env } from "../env.js";
import type {
  BankDataProvider,
  ProviderAccount,
  ProviderInvestment,
  ProviderTransaction,
} from "./types.js";

const INVESTMENTS_PAGE_SIZE = 100;

function toProviderAccount(account: PluggyAccountDto): ProviderAccount {
  return {
    id: account.id,
    name: account.name,
    type: account.type,
    subtype: account.subtype ?? null,
    balance: account.balance,
  };
}

function toProviderTransaction(tx: PluggyTransactionDto): ProviderTransaction {
  return {
    id: tx.id,
    description: tx.description,
    amount: tx.amount,
    type: tx.type,
    date: new Date(tx.date).toISOString(),
    category: tx.category ?? null,
    status: tx.status ?? "POSTED",
    creditCardMetadata: {
      installmentNumber: tx.creditCardMetadata?.installmentNumber ?? null,
      totalInstallments: tx.creditCardMetadata?.totalInstallments ?? null,
    },
  };
}

function toProviderInvestment(investment: PluggyInvestmentDto): ProviderInvestment {
  return {
    id: investment.id,
    name: investment.name,
    type: investment.type,
    subtype: investment.subtype ?? null,
    balance: investment.balance,
    amountOriginal: investment.amountOriginal ?? null,
  };
}

export function createPluggyProvider(): BankDataProvider {
  let client: PluggyClient | undefined;

  function getClient(): PluggyClient {
    if (!client) {
      if (!env.PLUGGY_CLIENT_ID || !env.PLUGGY_CLIENT_SECRET) {
        throw new Error(
          "PLUGGY_CLIENT_ID and PLUGGY_CLIENT_SECRET are required when DATA_PROVIDER=pluggy",
        );
      }
      client = new PluggyClient({
        clientId: env.PLUGGY_CLIENT_ID,
        clientSecret: env.PLUGGY_CLIENT_SECRET,
      });
    }
    return client;
  }

  return {
    async createConnectToken(webhookUrl) {
      const { accessToken } = await getClient().createConnectToken(undefined, {
        webhookUrl,
        clientUserId: "haven-owner",
        avoidDuplicates: true,
      });
      return { accessToken };
    },

    async fetchItem(itemId) {
      const item = await getClient().fetchItem(itemId);
      return { id: item.id, connectorName: item.connector.name, status: item.status };
    },

    async fetchAccounts(itemId) {
      const { results } = await getClient().fetchAccounts(itemId);
      return results.map(toProviderAccount);
    },

    async fetchTransactions(accountId, options) {
      const results = await getClient().fetchAllTransactions(
        accountId,
        options?.dateFrom ? { dateFrom: options.dateFrom } : {},
      );
      return results.map(toProviderTransaction);
    },

    async fetchInvestments(itemId) {
      const collected: PluggyInvestmentDto[] = [];
      let page = 1;
      let totalPages = 1;
      do {
        const response = await getClient().fetchInvestments(itemId, undefined, {
          page,
          pageSize: INVESTMENTS_PAGE_SIZE,
        });
        collected.push(...response.results);
        totalPages = response.totalPages;
        page += 1;
      } while (page <= totalPages);
      return collected.map(toProviderInvestment);
    },
  };
}
