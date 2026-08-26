CREATE TYPE "public"."payment_mode" AS ENUM('cash', 'installments');--> statement-breakpoint
CREATE TYPE "public"."purchase_status" AS ENUM('draft', 'approved', 'purchased', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."recurring_cadence" AS ENUM('monthly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."recurring_kind" AS ENUM('income', 'expense');--> statement-breakpoint
CREATE TABLE "planned_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"total_cents" bigint NOT NULL,
	"planned_date" date NOT NULL,
	"payment_mode" "payment_mode" NOT NULL,
	"installments_count" integer,
	"status" "purchase_status" DEFAULT 'draft' NOT NULL,
	"category_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "recurring_kind" NOT NULL,
	"name" text NOT NULL,
	"amount_cents" bigint NOT NULL,
	"cadence" "recurring_cadence" NOT NULL,
	"due_day" integer NOT NULL,
	"due_month" integer,
	"category_id" uuid,
	"active_from" date NOT NULL,
	"active_until" date,
	"match_pattern" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "recurring_entry_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "planned_purchase_id" uuid;--> statement-breakpoint
ALTER TABLE "planned_purchases" ADD CONSTRAINT "planned_purchases_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_entries" ADD CONSTRAINT "recurring_entries_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recurring_entry_id_recurring_entries_id_fk" FOREIGN KEY ("recurring_entry_id") REFERENCES "public"."recurring_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_planned_purchase_id_planned_purchases_id_fk" FOREIGN KEY ("planned_purchase_id") REFERENCES "public"."planned_purchases"("id") ON DELETE set null ON UPDATE no action;