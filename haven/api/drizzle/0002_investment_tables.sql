CREATE TYPE "public"."asset_source" AS ENUM('pluggy', 'manual');--> statement-breakpoint
CREATE TYPE "public"."asset_type" AS ENUM('fixed_income', 'stocks', 'funds', 'pension', 'crypto', 'other');--> statement-breakpoint
CREATE TABLE "investment_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"asset_type" "asset_type" NOT NULL,
	"source" "asset_source" NOT NULL,
	"pluggy_investment_id" text,
	"connection_id" uuid,
	"invested_cents" bigint DEFAULT 0 NOT NULL,
	"current_value_cents" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "investment_assets_pluggy_investment_id_unique" UNIQUE("pluggy_investment_id")
);
--> statement-breakpoint
CREATE TABLE "investment_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"snapshot_date" date NOT NULL,
	"value_cents" bigint NOT NULL,
	"invested_cents" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "investment_assets" ADD CONSTRAINT "investment_assets_connection_id_bank_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."bank_connections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_snapshots" ADD CONSTRAINT "investment_snapshots_asset_id_investment_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."investment_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "investment_snapshots_asset_date_idx" ON "investment_snapshots" USING btree ("asset_id","snapshot_date");