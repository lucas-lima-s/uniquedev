import type { AccountType, AssetType } from "@haven/shared";
import { reaisToCents } from "@haven/shared";
import { eq } from "drizzle-orm";
import { applyLearnedClassification } from "../db/apply-classification.js";
import { db } from "../db/client.js";
import { accounts, bankConnections, investmentAssets, transactions } from "../db/schema.js";
import { snapshotInvestments } from "../jobs/snapshot-investments.js";
import { provider } from "../providers/index.js";
import type {
  ProviderAccount,
  ProviderInvestment,
  ProviderTransaction,
} from "../providers/types.js";

const RESYNC_WINDOW_DAYS = 45;

function mapAssetType(investment: ProviderInvestment): AssetType {
  switch (investment.type) {
    case "FIXED_INCOME":
      return "fixed_income";
    case "EQUITY":
      return investment.subtype === "REAL_ESTATE_FUND" ? "funds" : "stocks";
    case "ETF":
      return "stocks";
    case "MUTUAL_FUND":
      return "funds";
    case "SECURITY":
      return "pension";
    default:
      return "other";
  }
}

async function syncInvestments(connectionId: string, itemId: string): Promise<void> {
  const investments = await provider.fetchInvestments(itemId);
  for (const investment of investments) {
    const currentValueCents = reaisToCents(investment.balance);
    const investedCents = reaisToCents(investment.amountOriginal ?? investment.balance);
    await db
      .insert(investmentAssets)
      .values({
        name: investment.name,
        assetType: mapAssetType(investment),
        source: "pluggy",
        pluggyInvestmentId: investment.id,
        connectionId,
        investedCents,
        currentValueCents,
      })
      .onConflictDoUpdate({
        target: investmentAssets.pluggyInvestmentId,
        set: {
          name: investment.name,
          assetType: mapAssetType(investment),
          connectionId,
          investedCents,
          currentValueCents,
          updatedAt: new Date(),
        },
      });
  }
  if (investments.length > 0) {
    await snapshotInvestments();
  }
}

function mapAccountType(account: ProviderAccount): AccountType {
  switch (account.subtype) {
    case "CREDIT_CARD":
      return "credit_card";
    case "SAVINGS_ACCOUNT":
      return "savings";
    case "CHECKING_ACCOUNT":
      return "checking";
    case "INVESTMENT_ACCOUNT":
      return "investment";
    default:
      return account.type === "CREDIT" ? "credit_card" : "checking";
  }
}

function signedCents(transaction: ProviderTransaction): number {
  const magnitude = Math.abs(reaisToCents(transaction.amount));
  return transaction.type === "DEBIT" ? -magnitude : magnitude;
}

function resyncDateFrom(lastSyncedAt: Date | null): string | undefined {
  if (!lastSyncedAt) return undefined;
  const from = new Date(lastSyncedAt);
  from.setDate(from.getDate() - RESYNC_WINDOW_DAYS);
  return from.toISOString().slice(0, 10);
}

export async function syncItem(itemId: string): Promise<void> {
  const item = await provider.fetchItem(itemId);
  const syncStartedAt = new Date();

  const [existing] = await db
    .select({ lastSyncedAt: bankConnections.lastSyncedAt })
    .from(bankConnections)
    .where(eq(bankConnections.pluggyItemId, item.id));
  const dateFrom = resyncDateFrom(existing?.lastSyncedAt ?? null);

  const [connection] = await db
    .insert(bankConnections)
    .values({
      pluggyItemId: item.id,
      institutionName: item.connectorName,
      status: item.status,
    })
    .onConflictDoUpdate({
      target: bankConnections.pluggyItemId,
      set: { institutionName: item.connectorName, status: item.status },
    })
    .returning({ id: bankConnections.id });
  if (!connection) return;

  const providerAccounts = await provider.fetchAccounts(item.id);

  for (const providerAccount of providerAccounts) {
    const balanceCents = reaisToCents(providerAccount.balance);
    const [account] = await db
      .insert(accounts)
      .values({
        connectionId: connection.id,
        pluggyAccountId: providerAccount.id,
        name: providerAccount.name,
        type: mapAccountType(providerAccount),
        balanceCents,
      })
      .onConflictDoUpdate({
        target: accounts.pluggyAccountId,
        set: {
          name: providerAccount.name,
          type: mapAccountType(providerAccount),
          balanceCents,
          updatedAt: new Date(),
        },
      })
      .returning({ id: accounts.id });
    if (!account) continue;

    const providerTransactions = await provider.fetchTransactions(
      providerAccount.id,
      dateFrom ? { dateFrom } : {},
    );

    for (const tx of providerTransactions) {
      const values = {
        accountId: account.id,
        pluggyTransactionId: tx.id,
        description: tx.description,
        amountCents: signedCents(tx),
        date: new Date(tx.date),
        pluggyCategory: tx.category,
        isPending: tx.status === "PENDING",
        installmentNumber: tx.creditCardMetadata.installmentNumber,
        installmentTotal: tx.creditCardMetadata.totalInstallments,
      };
      await db
        .insert(transactions)
        .values(values)
        .onConflictDoUpdate({
          target: transactions.pluggyTransactionId,
          set: {
            description: values.description,
            amountCents: values.amountCents,
            date: values.date,
            pluggyCategory: values.pluggyCategory,
            isPending: values.isPending,
            installmentNumber: values.installmentNumber,
            installmentTotal: values.installmentTotal,
          },
        });
    }
  }

  await syncInvestments(connection.id, item.id);
  await applyLearnedClassification();

  await db
    .update(bankConnections)
    .set({ lastSyncedAt: syncStartedAt })
    .where(eq(bankConnections.id, connection.id));
}
