CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"dedup_key" text NOT NULL,
	"payload" jsonb NOT NULL,
	"channel" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_dedup_key_unique" UNIQUE("dedup_key")
);
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "large_transaction_threshold_cents" bigint DEFAULT 100000 NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "alerts_enabled" boolean DEFAULT false NOT NULL;
