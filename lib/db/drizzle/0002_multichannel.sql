CREATE TYPE "public"."telegram_bot_status" AS ENUM('connected', 'disconnected', 'error');--> statement-breakpoint
CREATE TYPE "public"."channel_type" AS ENUM('whatsapp', 'telegram');--> statement-breakpoint
CREATE TABLE "telegram_bots" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"bot_token" text NOT NULL,
	"bot_id" text,
	"bot_username" text,
	"bot_first_name" text,
	"status" "telegram_bot_status" DEFAULT 'disconnected' NOT NULL,
	"webhook_secret" text,
	"webhook_url" text,
	"last_error" text,
	"last_connected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "contacts_tenant_phone_idx";--> statement-breakpoint
ALTER TABLE "contacts" ALTER COLUMN "phone" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "channel" "channel_type" DEFAULT 'whatsapp' NOT NULL;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "external_id" text;
--> statement-breakpoint
-- Backfill: no WhatsApp o identificador nativo do canal e o proprio telefone.
UPDATE "contacts" SET "external_id" = "phone" WHERE "external_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "contacts" ALTER COLUMN "external_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "telegram_bots" ADD CONSTRAINT "telegram_bots_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "telegram_bots_tenant_idx" ON "telegram_bots" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "telegram_bots_status_idx" ON "telegram_bots" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_tenant_channel_external_idx" ON "contacts" USING btree ("tenant_id","channel","external_id");--> statement-breakpoint
CREATE INDEX "contacts_tenant_phone_idx" ON "contacts" USING btree ("tenant_id","phone");--> statement-breakpoint
-- Nova tabela herda a politica deny-all de 0001_enable_rls.
ALTER TABLE "telegram_bots" ENABLE ROW LEVEL SECURITY;
