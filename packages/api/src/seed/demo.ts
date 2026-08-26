import { addMonths, dateInMonth, monthStart } from "@haven/shared";
import { eq } from "drizzle-orm";
import { db, sql } from "../db/client.js";
import {
  budgets,
  categories,
  investmentAssets,
  investmentSnapshots,
  plannedPurchases,
  recurringEntries,
} from "../db/schema.js";
import { env } from "../env.js";
import { deterministicUuid, seededRng } from "../lib/deterministic-rng.js";
import { MOCK_ITEM_IDS } from "../providers/index.js";
import { syncItem } from "../sync/sync-item.js";

function refuseInProduction(): void {
  const forced = process.argv.includes("--force");
  if (env.NODE_ENV === "production" && !forced) {
    throw new Error(
      "refusing to seed demo data with NODE_ENV=production; pass --force to override",
    );
  }
}

const CATEGORY_NAMES = [
  "Moradia",
  "Mercado",
  "Transporte",
  "Saúde",
  "Lazer",
  "Educação",
  "Assinaturas",
  "Outros",
] as const;

async function upsertCategoryByName(name: string): Promise<string> {
  const [existing] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.name, name));
  if (existing) return existing.id;
  const [created] = await db
    .insert(categories)
    .values({ id: deterministicUuid("category", name), name })
    .returning({ id: categories.id });
  if (!created) throw new Error(`failed to create category "${name}"`);
  return created.id;
}

async function seedCategories(): Promise<Record<string, string>> {
  const ids: Record<string, string> = {};
  for (const name of CATEGORY_NAMES) {
    ids[name] = await upsertCategoryByName(name);
  }
  return ids;
}

interface RecurringSeed {
  kind: "income" | "expense";
  name: string;
  amountCents: number;
  cadence: "monthly" | "yearly";
  dueDay: number;
  dueMonth: number | null;
  categoryId: string | null;
}

function buildRecurringSeeds(categoryIds: Record<string, string>): RecurringSeed[] {
  return [
    {
      kind: "income",
      name: "Salário",
      amountCents: 850000,
      cadence: "monthly",
      dueDay: 5,
      dueMonth: null,
      categoryId: null,
    },
    {
      kind: "expense",
      name: "Aluguel",
      amountCents: 220000,
      cadence: "monthly",
      dueDay: 10,
      dueMonth: null,
      categoryId: categoryIds.Moradia ?? null,
    },
    {
      kind: "expense",
      name: "Internet",
      amountCents: 9900,
      cadence: "monthly",
      dueDay: 15,
      dueMonth: null,
      categoryId: categoryIds.Moradia ?? null,
    },
    {
      kind: "expense",
      name: "Academia",
      amountCents: 12000,
      cadence: "monthly",
      dueDay: 8,
      dueMonth: null,
      categoryId: categoryIds["Saúde"] ?? null,
    },
    {
      kind: "expense",
      name: "Streaming de vídeo",
      amountCents: 4490,
      cadence: "monthly",
      dueDay: 20,
      dueMonth: null,
      categoryId: categoryIds.Assinaturas ?? null,
    },
    {
      kind: "expense",
      name: "IPVA",
      amountCents: 180000,
      cadence: "yearly",
      dueDay: 20,
      dueMonth: 1,
      categoryId: categoryIds.Transporte ?? null,
    },
  ];
}

async function upsertRecurring(entry: RecurringSeed): Promise<void> {
  const values = {
    kind: entry.kind,
    name: entry.name,
    amountCents: entry.amountCents,
    cadence: entry.cadence,
    dueDay: entry.dueDay,
    dueMonth: entry.dueMonth,
    categoryId: entry.categoryId,
    activeFrom: "2026-01-01",
    activeUntil: null,
    matchPattern: null,
  };
  const [existing] = await db
    .select({ id: recurringEntries.id })
    .from(recurringEntries)
    .where(eq(recurringEntries.name, entry.name));
  if (existing) {
    await db
      .update(recurringEntries)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(recurringEntries.id, existing.id));
  } else {
    await db
      .insert(recurringEntries)
      .values({ ...values, id: deterministicUuid("recurring", entry.name) });
  }
}

interface PurchaseSeed {
  name: string;
  totalCents: number;
  plannedDate: string;
  paymentMode: "cash" | "installments";
  installmentsCount: number | null;
  status: "draft" | "approved" | "purchased" | "cancelled";
  categoryId: string | null;
}

function buildPurchaseSeeds(categoryIds: Record<string, string>): PurchaseSeed[] {
  const currentMonth = monthStart(new Date());
  return [
    {
      name: "Notebook novo",
      totalCents: 450000,
      plannedDate: dateInMonth(addMonths(currentMonth, 1), 15),
      paymentMode: "cash",
      installmentsCount: null,
      status: "draft",
      categoryId: categoryIds.Outros ?? null,
    },
    {
      name: "Geladeira",
      totalCents: 300000,
      plannedDate: dateInMonth(currentMonth, 25),
      paymentMode: "installments",
      installmentsCount: 6,
      status: "approved",
      categoryId: categoryIds.Moradia ?? null,
    },
    {
      name: "Viagem de férias",
      totalCents: 800000,
      plannedDate: dateInMonth(addMonths(currentMonth, 2), 10),
      paymentMode: "cash",
      installmentsCount: null,
      status: "draft",
      categoryId: categoryIds.Lazer ?? null,
    },
  ];
}

async function upsertPurchase(entry: PurchaseSeed): Promise<void> {
  const values = {
    name: entry.name,
    totalCents: entry.totalCents,
    plannedDate: entry.plannedDate,
    paymentMode: entry.paymentMode,
    installmentsCount: entry.installmentsCount,
    status: entry.status,
    categoryId: entry.categoryId,
    notes: null,
  };
  const [existing] = await db
    .select({ id: plannedPurchases.id })
    .from(plannedPurchases)
    .where(eq(plannedPurchases.name, entry.name));
  if (existing) {
    await db
      .update(plannedPurchases)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(plannedPurchases.id, existing.id));
  } else {
    await db
      .insert(plannedPurchases)
      .values({ ...values, id: deterministicUuid("purchase", entry.name) });
  }
}

async function seedBudgets(categoryIds: Record<string, string>): Promise<void> {
  const month = monthStart(new Date());
  const targets: [string, number][] = [
    ["Mercado", 80000],
    ["Transporte", 40000],
    ["Lazer", 60000],
  ];
  for (const [name, limitCents] of targets) {
    const categoryId = categoryIds[name];
    if (!categoryId) continue;
    await db
      .insert(budgets)
      .values({ categoryId, month, limitCents })
      .onConflictDoUpdate({
        target: [budgets.categoryId, budgets.month],
        set: { limitCents },
      });
  }
}

interface ManualInvestmentSeed {
  name: string;
  assetType: "fixed_income" | "crypto";
  investedCents: number;
  currentValueCents: number;
}

const MANUAL_INVESTMENTS: ManualInvestmentSeed[] = [
  {
    name: "Reserva de emergência",
    assetType: "fixed_income",
    investedCents: 1000000,
    currentValueCents: 1050000,
  },
  { name: "Criptoativos", assetType: "crypto", investedCents: 200000, currentValueCents: 180000 },
];

async function seedManualInvestments(): Promise<void> {
  for (const entry of MANUAL_INVESTMENTS) {
    const [existing] = await db
      .select({ id: investmentAssets.id })
      .from(investmentAssets)
      .where(eq(investmentAssets.name, entry.name));
    if (existing) {
      await db
        .update(investmentAssets)
        .set({
          investedCents: entry.investedCents,
          currentValueCents: entry.currentValueCents,
          updatedAt: new Date(),
        })
        .where(eq(investmentAssets.id, existing.id));
    } else {
      await db.insert(investmentAssets).values({
        id: deterministicUuid("investment", entry.name),
        name: entry.name,
        assetType: entry.assetType,
        source: "manual",
        investedCents: entry.investedCents,
        currentValueCents: entry.currentValueCents,
      });
    }
  }
}

const SNAPSHOT_HISTORY_DAYS = 90;

async function backfillInvestmentSnapshots(): Promise<void> {
  const assets = await db
    .select({
      id: investmentAssets.id,
      pluggyInvestmentId: investmentAssets.pluggyInvestmentId,
      name: investmentAssets.name,
      investedCents: investmentAssets.investedCents,
      currentValueCents: investmentAssets.currentValueCents,
    })
    .from(investmentAssets);

  const today = new Date();

  for (const asset of assets) {
    const stableKey = asset.pluggyInvestmentId ?? `manual:${asset.name}`;
    const rng = seededRng("snapshot-walk", stableKey);
    const drift = (asset.currentValueCents - asset.investedCents) / SNAPSHOT_HISTORY_DAYS;
    const noiseScale = Math.max(Math.abs(drift), Math.abs(asset.investedCents) * 0.002, 1);

    let value = asset.investedCents;
    for (let daysAgo = SNAPSHOT_HISTORY_DAYS - 1; daysAgo >= 0; daysAgo -= 1) {
      const snapshotDate = new Date(today);
      snapshotDate.setUTCDate(snapshotDate.getUTCDate() - daysAgo);
      const noise = (rng() - 0.5) * noiseScale;
      value = daysAgo === 0 ? asset.currentValueCents : Math.round(value + drift + noise);

      await db
        .insert(investmentSnapshots)
        .values({
          assetId: asset.id,
          snapshotDate: snapshotDate.toISOString().slice(0, 10),
          valueCents: value,
          investedCents: asset.investedCents,
        })
        .onConflictDoUpdate({
          target: [investmentSnapshots.assetId, investmentSnapshots.snapshotDate],
          set: { valueCents: value, investedCents: asset.investedCents },
        });
    }
  }
}

export async function seedDemo(): Promise<void> {
  refuseInProduction();

  for (const itemId of MOCK_ITEM_IDS) {
    await syncItem(itemId);
  }

  const categoryIds = await seedCategories();
  for (const entry of buildRecurringSeeds(categoryIds)) {
    await upsertRecurring(entry);
  }
  for (const entry of buildPurchaseSeeds(categoryIds)) {
    await upsertPurchase(entry);
  }
  await seedBudgets(categoryIds);
  await seedManualInvestments();
  await backfillInvestmentSnapshots();
}

await seedDemo();
await sql.end();
console.log("Demo dataset seeded.");
process.exit(0);
