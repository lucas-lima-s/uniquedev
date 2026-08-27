import { pick, randomInt, seededRng } from "../lib/deterministic-rng.js";
import type {
  BankDataProvider,
  ProviderAccount,
  ProviderInvestment,
  ProviderItem,
  ProviderTransaction,
} from "./types.js";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

const MOCK_ITEMS: Record<string, { connectorName: string; status: string }> = {
  "mock-item-1": { connectorName: "Banco Aurora", status: "UPDATED" },
  "mock-item-2": { connectorName: "Banco Meridian", status: "UPDATED" },
};

interface MockAccountDef {
  id: string;
  itemId: string;
  name: string;
  type: string;
  subtype: string;
  balance: number;
  hasTransactions: boolean;
}

const MOCK_ACCOUNTS: MockAccountDef[] = [
  {
    id: "mock-account-checking",
    itemId: "mock-item-1",
    name: "Conta Corrente Aurora",
    type: "BANK",
    subtype: "CHECKING_ACCOUNT",
    balance: 4231.55,
    hasTransactions: true,
  },
  {
    id: "mock-account-credit-card",
    itemId: "mock-item-1",
    name: "Cartão Aurora Platinum",
    type: "CREDIT",
    subtype: "CREDIT_CARD",
    balance: -1875.32,
    hasTransactions: true,
  },
  {
    id: "mock-account-savings",
    itemId: "mock-item-2",
    name: "Poupança Meridian",
    type: "BANK",
    subtype: "SAVINGS_ACCOUNT",
    balance: 12500,
    hasTransactions: true,
  },
  {
    id: "mock-account-investment",
    itemId: "mock-item-2",
    name: "Conta Investimento Meridian",
    type: "BANK",
    subtype: "INVESTMENT_ACCOUNT",
    balance: 0,
    hasTransactions: false,
  },
];

interface TransactionTemplate {
  description: string;
  category: string;
  min: number;
  max: number;
  installments?: number;
}

const EXPENSE_TEMPLATES: TransactionTemplate[] = [
  { description: "Supermercado Pão de Minas", category: "Mercado", min: 45, max: 320 },
  { description: "Restaurante Sabor Caseiro", category: "Alimentação", min: 25, max: 120 },
  { description: "Posto Estrela Combustíveis", category: "Transporte", min: 80, max: 220 },
  { description: "Aplicativo de transporte", category: "Transporte", min: 12, max: 45 },
  { description: "Farmácia Vida Plena", category: "Saúde", min: 18, max: 150 },
  { description: "Academia Corpo Ativo", category: "Saúde", min: 90, max: 90 },
  { description: "Cinema Estação Cultural", category: "Lazer", min: 30, max: 80 },
  { description: "Streaming de vídeo", category: "Assinaturas", min: 25, max: 55 },
  { description: "Streaming de música", category: "Assinaturas", min: 15, max: 20 },
  { description: "Livraria Página Viva", category: "Educação", min: 35, max: 140 },
  { description: "Curso online de programação", category: "Educação", min: 60, max: 300 },
  {
    description: "Loja de roupas Estilo Único",
    category: "Lazer",
    min: 70,
    max: 380,
    installments: 3,
  },
  {
    description: "Loja de eletrônicos Circuito Norte",
    category: "Lazer",
    min: 200,
    max: 900,
    installments: 6,
  },
  { description: "Companhia de energia elétrica", category: "Moradia", min: 120, max: 260 },
  { description: "Companhia de água e saneamento", category: "Moradia", min: 45, max: 95 },
  { description: "Provedor de internet", category: "Moradia", min: 90, max: 110 },
  { description: "Condomínio residencial", category: "Moradia", min: 450, max: 450 },
];

const INCOME_TEMPLATES: TransactionTemplate[] = [
  { description: "Transferência recebida", category: "Outros", min: 100, max: 800 },
  { description: "Reembolso de despesa", category: "Outros", min: 40, max: 200 },
];

const TRANSACTIONS_PER_ACCOUNT_PER_MONTH = 20;
const MONTHS_OF_HISTORY = 3;

function monthsAgo(now: Date, months: number): { year: number; month: number } {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function generateTransactionsForAccount(account: MockAccountDef, now: Date): ProviderTransaction[] {
  if (!account.hasTransactions) return [];
  const rng = seededRng("transactions", account.id);
  const transactions: ProviderTransaction[] = [];

  for (let monthOffset = MONTHS_OF_HISTORY - 1; monthOffset >= 0; monthOffset -= 1) {
    const { year, month } = monthsAgo(now, monthOffset);
    const lastDay = daysInMonth(year, month);

    for (let i = 0; i < TRANSACTIONS_PER_ACCOUNT_PER_MONTH; i += 1) {
      const isIncome = rng() < 0.1;
      const template = isIncome ? pick(rng, INCOME_TEMPLATES) : pick(rng, EXPENSE_TEMPLATES);
      const day = randomInt(rng, 1, lastDay);
      const hour = randomInt(rng, 7, 22);
      const minute = randomInt(rng, 0, 59);
      const date = new Date(Date.UTC(year, month, day, hour, minute)).toISOString();
      const amount = round2(template.min + rng() * (template.max - template.min));
      const installmentTotal = template.installments ?? null;
      const installmentNumber = installmentTotal ? randomInt(rng, 1, installmentTotal) : null;

      transactions.push({
        id: `mock-tx-${account.id}-${year}${String(month + 1).padStart(2, "0")}-${i}`,
        description: template.description,
        amount,
        type: isIncome ? "CREDIT" : "DEBIT",
        date,
        category: template.category,
        status: "POSTED",
        creditCardMetadata: { installmentNumber, totalInstallments: installmentTotal },
      });
    }
  }

  return transactions.sort((a, b) => a.date.localeCompare(b.date));
}

interface MockInvestmentDef {
  id: string;
  itemId: string;
  name: string;
  type: string;
  subtype: string;
  investedCents: number;
}

const MOCK_INVESTMENTS: MockInvestmentDef[] = [
  {
    id: "mock-investment-1",
    itemId: "mock-item-1",
    name: "Tesouro Selic 2029",
    type: "FIXED_INCOME",
    subtype: "TREASURY",
    investedCents: 800000,
  },
  {
    id: "mock-investment-2",
    itemId: "mock-item-1",
    name: "CDB Banco Aurora 110% CDI",
    type: "FIXED_INCOME",
    subtype: "CDB",
    investedCents: 500000,
  },
  {
    id: "mock-investment-3",
    itemId: "mock-item-1",
    name: "Ações Aurora Participações ON",
    type: "EQUITY",
    subtype: "STOCK",
    investedCents: 300000,
  },
  {
    id: "mock-investment-4",
    itemId: "mock-item-2",
    name: "Ações Meridian Energia PN",
    type: "EQUITY",
    subtype: "STOCK",
    investedCents: 250000,
  },
  {
    id: "mock-investment-5",
    itemId: "mock-item-2",
    name: "Fundo Multimercado Meridian",
    type: "MUTUAL_FUND",
    subtype: "MULTIMARKET",
    investedCents: 600000,
  },
];

export function createMockProvider(): BankDataProvider {
  return {
    async createConnectToken() {
      return { accessToken: "mock-connect-token" }; // repo-audit: allow-secret
    },

    async fetchItem(itemId: string): Promise<ProviderItem> {
      const item = MOCK_ITEMS[itemId];
      if (!item) throw new Error(`unknown mock item: ${itemId}`);
      return { id: itemId, connectorName: item.connectorName, status: item.status };
    },

    async fetchAccounts(itemId: string): Promise<ProviderAccount[]> {
      return MOCK_ACCOUNTS.filter((account) => account.itemId === itemId).map((account) => ({
        id: account.id,
        name: account.name,
        type: account.type,
        subtype: account.subtype,
        balance: account.balance,
      }));
    },

    async fetchTransactions(accountId, options) {
      const account = MOCK_ACCOUNTS.find((candidate) => candidate.id === accountId);
      if (!account) return [];
      const all = generateTransactionsForAccount(account, new Date());
      if (!options?.dateFrom) return all;
      return all.filter((tx) => tx.date.slice(0, 10) >= options.dateFrom!);
    },

    async fetchInvestments(itemId: string): Promise<ProviderInvestment[]> {
      return MOCK_INVESTMENTS.filter((investment) => investment.itemId === itemId).map(
        (investment) => {
          const rng = seededRng("investment-gain", investment.id);
          const gainPct = -0.05 + rng() * 0.23;
          const balanceCents = Math.round(investment.investedCents * (1 + gainPct));
          return {
            id: investment.id,
            name: investment.name,
            type: investment.type,
            subtype: investment.subtype,
            balance: balanceCents / 100,
            amountOriginal: investment.investedCents / 100,
          };
        },
      );
    },

    async fetchBills(accountId) {
      const account = MOCK_ACCOUNTS.find((candidate) => candidate.id === accountId);
      if (!account || account.subtype !== "CREDIT_CARD") return [];
      const now = new Date();
      const due = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 10));
      return [
        {
          id: `mock-bill-${accountId}-current`,
          dueDate: due.toISOString().slice(0, 10),
          totalAmount: Math.abs(account.balance),
          status: "OPEN",
        },
      ];
    },
  };
}

export const MOCK_ITEM_IDS = Object.keys(MOCK_ITEMS);
