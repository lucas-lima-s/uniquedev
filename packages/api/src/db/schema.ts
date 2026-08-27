import {
  type AnyPgColumn,
  bigint,
  boolean,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const cents = (name: string) => bigint(name, { mode: "number" });
const timestampTz = (name: string) => timestamp(name, { withTimezone: true });

export const accountTypeEnum = pgEnum("account_type", [
  "checking",
  "savings",
  "credit_card",
  "investment",
]);

export const webhookStatusEnum = pgEnum("webhook_status", ["pending", "processed", "error"]);

export const recurringKindEnum = pgEnum("recurring_kind", ["income", "expense"]);

export const recurringCadenceEnum = pgEnum("recurring_cadence", ["monthly", "yearly"]);

export const paymentModeEnum = pgEnum("payment_mode", ["cash", "installments"]);

export const purchaseStatusEnum = pgEnum("purchase_status", [
  "draft",
  "approved",
  "purchased",
  "cancelled",
]);

export const assetTypeEnum = pgEnum("asset_type", [
  "fixed_income",
  "stocks",
  "funds",
  "pension",
  "crypto",
  "other",
]);

export const assetSourceEnum = pgEnum("asset_source", ["pluggy", "manual"]);

export const goalKindEnum = pgEnum("goal_kind", ["goal", "emergency_fund"]);

export const bankConnections = pgTable("bank_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  pluggyItemId: text("pluggy_item_id").notNull().unique(),
  institutionName: text("institution_name").notNull(),
  status: text("status").notNull(),
  lastSyncedAt: timestampTz("last_synced_at"),
  createdAt: timestampTz("created_at").notNull().defaultNow(),
});

export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  connectionId: uuid("connection_id")
    .notNull()
    .references(() => bankConnections.id, { onDelete: "cascade" }),
  pluggyAccountId: text("pluggy_account_id").notNull().unique(),
  name: text("name").notNull(),
  type: accountTypeEnum("type").notNull(),
  balanceCents: cents("balance_cents").notNull().default(0),
  updatedAt: timestampTz("updated_at").notNull().defaultNow(),
});

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  parentId: uuid("parent_id").references((): AnyPgColumn => categories.id, {
    onDelete: "set null",
  }),
});

export const recurringEntries = pgTable("recurring_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  kind: recurringKindEnum("kind").notNull(),
  name: text("name").notNull(),
  amountCents: cents("amount_cents").notNull(),
  cadence: recurringCadenceEnum("cadence").notNull(),
  dueDay: integer("due_day").notNull(),
  dueMonth: integer("due_month"),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  activeFrom: date("active_from").notNull(),
  activeUntil: date("active_until"),
  matchPattern: text("match_pattern"),
  createdAt: timestampTz("created_at").notNull().defaultNow(),
  updatedAt: timestampTz("updated_at").notNull().defaultNow(),
});

export const plannedPurchases = pgTable("planned_purchases", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  totalCents: cents("total_cents").notNull(),
  plannedDate: date("planned_date").notNull(),
  paymentMode: paymentModeEnum("payment_mode").notNull(),
  installmentsCount: integer("installments_count"),
  status: purchaseStatusEnum("status").notNull().default("draft"),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: timestampTz("created_at").notNull().defaultNow(),
  updatedAt: timestampTz("updated_at").notNull().defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  pluggyTransactionId: text("pluggy_transaction_id").notNull().unique(),
  description: text("description").notNull(),
  amountCents: cents("amount_cents").notNull(),
  date: timestampTz("date").notNull(),
  pluggyCategory: text("pluggy_category"),
  customCategoryId: uuid("custom_category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  isPending: boolean("is_pending").notNull().default(false),
  installmentNumber: integer("installment_number"),
  installmentTotal: integer("installment_total"),
  recurringEntryId: uuid("recurring_entry_id").references(() => recurringEntries.id, {
    onDelete: "set null",
  }),
  plannedPurchaseId: uuid("planned_purchase_id").references(() => plannedPurchases.id, {
    onDelete: "set null",
  }),
  createdAt: timestampTz("created_at").notNull().defaultNow(),
});

export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    month: date("month").notNull(),
    limitCents: cents("limit_cents").notNull(),
  },
  (table) => [uniqueIndex("budgets_category_month_idx").on(table.categoryId, table.month)],
);

export const investmentAssets = pgTable("investment_assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  assetType: assetTypeEnum("asset_type").notNull(),
  source: assetSourceEnum("source").notNull(),
  pluggyInvestmentId: text("pluggy_investment_id").unique(),
  connectionId: uuid("connection_id").references(() => bankConnections.id, {
    onDelete: "set null",
  }),
  investedCents: cents("invested_cents").notNull().default(0),
  currentValueCents: cents("current_value_cents").notNull().default(0),
  createdAt: timestampTz("created_at").notNull().defaultNow(),
  updatedAt: timestampTz("updated_at").notNull().defaultNow(),
});

export const investmentSnapshots = pgTable(
  "investment_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => investmentAssets.id, { onDelete: "cascade" }),
    snapshotDate: date("snapshot_date").notNull(),
    valueCents: cents("value_cents").notNull(),
    investedCents: cents("invested_cents").notNull(),
  },
  (table) => [
    uniqueIndex("investment_snapshots_asset_date_idx").on(table.assetId, table.snapshotDate),
  ],
);

export const categoryRules = pgTable("category_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  pattern: text("pattern").notNull().unique(),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  priority: integer("priority").notNull().default(0),
  createdAt: timestampTz("created_at").notNull().defaultNow(),
  updatedAt: timestampTz("updated_at").notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  id: uuid("id").primaryKey(),
  emergencyFundMonths: integer("emergency_fund_months").notNull().default(6),
  largeTransactionThresholdCents: cents("large_transaction_threshold_cents")
    .notNull()
    .default(100000),
  alertsEnabled: boolean("alerts_enabled").notNull().default(false),
  updatedAt: timestampTz("updated_at").notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: text("type").notNull(),
  dedupKey: text("dedup_key").notNull().unique(),
  payload: jsonb("payload").notNull(),
  channel: text("channel").notNull(),
  sentAt: timestampTz("sent_at").notNull().defaultNow(),
});

export const goals = pgTable("goals", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  kind: goalKindEnum("kind").notNull(),
  targetCents: cents("target_cents").notNull().default(0),
  deadline: date("deadline"),
  accountId: uuid("account_id").references(() => accounts.id, { onDelete: "set null" }),
  plannedMonthlyCents: cents("planned_monthly_cents"),
  createdAt: timestampTz("created_at").notNull().defaultNow(),
  updatedAt: timestampTz("updated_at").notNull().defaultNow(),
});

export const goalContributions = pgTable("goal_contributions", {
  id: uuid("id").defaultRandom().primaryKey(),
  goalId: uuid("goal_id")
    .notNull()
    .references(() => goals.id, { onDelete: "cascade" }),
  amountCents: cents("amount_cents").notNull(),
  date: date("date").notNull(),
  transactionId: uuid("transaction_id").references(() => transactions.id, { onDelete: "set null" }),
  createdAt: timestampTz("created_at").notNull().defaultNow(),
});

export const creditCardBills = pgTable("credit_card_bills", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  pluggyBillId: text("pluggy_bill_id").notNull().unique(),
  dueDate: date("due_date").notNull(),
  totalCents: cents("total_cents").notNull(),
  status: text("status").notNull(),
});

export const webhookEvents = pgTable("webhook_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull(),
  status: webhookStatusEnum("status").notNull().default("pending"),
  error: text("error"),
  receivedAt: timestampTz("received_at").notNull().defaultNow(),
  processedAt: timestampTz("processed_at"),
});
