CREATE TYPE "public"."tenant_plan" AS ENUM('trial', 'starter', 'professional', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."tenant_status" AS ENUM('active', 'suspended', 'pending');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'supervisor', 'agent');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'invited', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."department_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."whatsapp_instance_status" AS ENUM('connecting', 'connected', 'disconnected', 'error');--> statement-breakpoint
CREATE TYPE "public"."distribution_mode" AS ENUM('manual', 'round_robin', 'least_load');--> statement-breakpoint
CREATE TYPE "public"."conversation_status" AS ENUM('new', 'ivr', 'waiting', 'active', 'closed');--> statement-breakpoint
CREATE TYPE "public"."message_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('received', 'pending', 'sent', 'delivered', 'read', 'failed');--> statement-breakpoint
CREATE TYPE "public"."message_type" AS ENUM('text', 'image', 'audio', 'video', 'document', 'location', 'sticker', 'template');--> statement-breakpoint
CREATE TYPE "public"."agent_status_type" AS ENUM('available', 'busy', 'away', 'offline');--> statement-breakpoint
CREATE TYPE "public"."deal_status" AS ENUM('open', 'won', 'lost');--> statement-breakpoint
CREATE TYPE "public"."custom_field_type" AS ENUM('text', 'number', 'date', 'select');--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo_url" text,
	"plan_type" "tenant_plan" DEFAULT 'trial' NOT NULL,
	"status" "tenant_status" DEFAULT 'pending' NOT NULL,
	"max_agents" integer DEFAULT 5 NOT NULL,
	"qr_share_token" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_users" (
	"tenant_id" integer NOT NULL,
	"clerk_user_id" text NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"avatar_url" text,
	"role" "user_role" DEFAULT 'agent' NOT NULL,
	"status" "user_status" DEFAULT 'invited' NOT NULL,
	"is_super_admin" boolean DEFAULT false NOT NULL,
	"access_expires_at" timestamp with time zone,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_users_tenant_id_clerk_user_id_pk" PRIMARY KEY("tenant_id","clerk_user_id")
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" text DEFAULT '#25D366' NOT NULL,
	"status" "department_status" DEFAULT 'active' NOT NULL,
	"max_agents" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "department_agents" (
	"department_id" integer NOT NULL,
	"tenant_id" integer NOT NULL,
	"clerk_user_id" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "department_agents_department_id_clerk_user_id_pk" PRIMARY KEY("department_id","clerk_user_id")
);
--> statement-breakpoint
CREATE TABLE "platform_config" (
	"key" text NOT NULL,
	"value" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_instances" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"instance_name" text NOT NULL,
	"api_token" text,
	"phone_number" text,
	"status" "whatsapp_instance_status" DEFAULT 'disconnected' NOT NULL,
	"qr_code" text,
	"qr_expires_at" timestamp with time zone,
	"last_connected_at" timestamp with time zone,
	"webhook_secret" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channel_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"welcome_message" text DEFAULT 'Olá! Bem-vindo ao nosso atendimento. 👋' NOT NULL,
	"menu_prompt" text DEFAULT 'Por favor, escolha uma opção:' NOT NULL,
	"menu_options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"off_hours_message" text DEFAULT 'Nosso atendimento está fechado no momento. Retornaremos em breve!' NOT NULL,
	"closing_message" text DEFAULT 'Conversa encerrada. Obrigado por entrar em contato! 😊' NOT NULL,
	"inactivity_timeout_minutes" integer DEFAULT 30 NOT NULL,
	"auto_close_enabled" boolean DEFAULT true NOT NULL,
	"distribution_mode" "distribution_mode" DEFAULT 'round_robin' NOT NULL,
	"working_hours_enabled" boolean DEFAULT false NOT NULL,
	"working_hours" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"phone" text NOT NULL,
	"name" text,
	"avatar_url" text,
	"email" text,
	"cpf" text,
	"origin" text DEFAULT 'organic' NOT NULL,
	"company" text,
	"assigned_to" text,
	"notes" text,
	"custom_data" jsonb,
	"first_contact_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_contact_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"contact_id" integer NOT NULL,
	"department_id" integer,
	"assigned_to" text,
	"status" "conversation_status" DEFAULT 'new' NOT NULL,
	"ivr_step" text,
	"ivr_attempts" integer DEFAULT 0 NOT NULL,
	"queue_position" integer,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"first_response_at" timestamp with time zone,
	"survey_sent_at" timestamp with time zone,
	"rating" integer,
	"rating_comment" text,
	"closed_at" timestamp with time zone,
	"closed_by" text,
	"closing_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"tenant_id" integer NOT NULL,
	"message_id" text,
	"from_phone" text NOT NULL,
	"to_phone" text NOT NULL,
	"type" "message_type" DEFAULT 'text' NOT NULL,
	"content" text,
	"media_url" text,
	"media_caption" text,
	"media_mime_type" text,
	"latitude" text,
	"longitude" text,
	"direction" "message_direction" NOT NULL,
	"status" "message_status" DEFAULT 'received' NOT NULL,
	"sent_by" text,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_statuses" (
	"clerk_user_id" text NOT NULL,
	"tenant_id" integer NOT NULL,
	"status" "agent_status_type" DEFAULT 'offline' NOT NULL,
	"max_conversations" integer DEFAULT 5 NOT NULL,
	"active_conversations" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_statuses_clerk_user_id_tenant_id_pk" PRIMARY KEY("clerk_user_id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "quick_replies" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"shortcut" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_tags" (
	"contact_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	"tenant_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contact_tags_contact_id_tag_id_pk" PRIMARY KEY("contact_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "conversation_tags" (
	"conversation_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	"tenant_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_tags_conversation_id_tag_id_pk" PRIMARY KEY("conversation_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#25D366' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_stages" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#25D366' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"contact_id" integer NOT NULL,
	"stage_id" integer NOT NULL,
	"title" text NOT NULL,
	"value" numeric(14, 2),
	"status" "deal_status" DEFAULT 'open' NOT NULL,
	"assigned_to" text,
	"description" text,
	"expected_close_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"contact_id" integer NOT NULL,
	"conversation_id" integer,
	"author_id" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_field_values" (
	"contact_id" integer NOT NULL,
	"field_id" integer NOT NULL,
	"tenant_id" integer NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "custom_field_values_contact_id_field_id_pk" PRIMARY KEY("contact_id","field_id")
);
--> statement-breakpoint
CREATE TABLE "custom_fields" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"name" text NOT NULL,
	"type" "custom_field_type" DEFAULT 'text' NOT NULL,
	"options" jsonb,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "internal_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"user_a" text NOT NULL,
	"user_b" text NOT NULL,
	"last_read_a" timestamp with time zone,
	"last_read_b" timestamp with time zone,
	"last_message_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "internal_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"tenant_id" integer NOT NULL,
	"sender_id" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenant_users" ADD CONSTRAINT "tenant_users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_agents" ADD CONSTRAINT "department_agents_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_agents" ADD CONSTRAINT "department_agents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_instances" ADD CONSTRAINT "whatsapp_instances_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_settings" ADD CONSTRAINT "channel_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_statuses" ADD CONSTRAINT "agent_statuses_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quick_replies" ADD CONSTRAINT "quick_replies_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_tags" ADD CONSTRAINT "contact_tags_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_tags" ADD CONSTRAINT "contact_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_tags" ADD CONSTRAINT "contact_tags_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_tags" ADD CONSTRAINT "conversation_tags_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_tags" ADD CONSTRAINT "conversation_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_tags" ADD CONSTRAINT "conversation_tags_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_stages" ADD CONSTRAINT "deal_stages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_stage_id_deal_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."deal_stages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_notes" ADD CONSTRAINT "contact_notes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_notes" ADD CONSTRAINT "contact_notes_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_notes" ADD CONSTRAINT "contact_notes_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_field_id_custom_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."custom_fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_fields" ADD CONSTRAINT "custom_fields_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_conversations" ADD CONSTRAINT "internal_conversations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_messages" ADD CONSTRAINT "internal_messages_conversation_id_internal_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."internal_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_messages" ADD CONSTRAINT "internal_messages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tenants_slug_idx" ON "tenants" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "tenants_qr_share_token_idx" ON "tenants" USING btree ("qr_share_token") WHERE "tenants"."qr_share_token" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "tenant_users_clerk_idx" ON "tenant_users" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "tenant_users_tenant_idx" ON "tenant_users" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "departments_tenant_idx" ON "departments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "dept_agents_tenant_idx" ON "department_agents" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "dept_agents_dept_idx" ON "department_agents" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "dept_agents_user_idx" ON "department_agents" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "platform_config_key_idx" ON "platform_config" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "whatsapp_instances_tenant_idx" ON "whatsapp_instances" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "whatsapp_instances_name_idx" ON "whatsapp_instances" USING btree ("instance_name");--> statement-breakpoint
CREATE INDEX "whatsapp_instances_status_idx" ON "whatsapp_instances" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "channel_settings_tenant_idx" ON "channel_settings" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_tenant_phone_idx" ON "contacts" USING btree ("tenant_id","phone");--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_tenant_cpf_idx" ON "contacts" USING btree ("tenant_id","cpf") WHERE "contacts"."cpf" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "contacts_tenant_idx" ON "contacts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "conversations_tenant_status_idx" ON "conversations" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "conversations_contact_idx" ON "conversations" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "conversations_assigned_idx" ON "conversations" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "conversations_dept_idx" ON "conversations" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "conversations_tenant_idx" ON "conversations" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "messages_tenant_msgid_idx" ON "messages" USING btree ("tenant_id","message_id");--> statement-breakpoint
CREATE INDEX "messages_conversation_idx" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "messages_tenant_idx" ON "messages" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "messages_timestamp_idx" ON "messages" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "agent_statuses_tenant_idx" ON "agent_statuses" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "agent_statuses_status_idx" ON "agent_statuses" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "quick_replies_tenant_shortcut_idx" ON "quick_replies" USING btree ("tenant_id","shortcut");--> statement-breakpoint
CREATE INDEX "quick_replies_tenant_idx" ON "quick_replies" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "contact_tags_tag_idx" ON "contact_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "contact_tags_tenant_idx" ON "contact_tags" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "conversation_tags_tag_idx" ON "conversation_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "conversation_tags_tenant_idx" ON "conversation_tags" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_tenant_name_idx" ON "tags" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE INDEX "tags_tenant_idx" ON "tags" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "deal_stages_tenant_idx" ON "deal_stages" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "deals_tenant_idx" ON "deals" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "deals_contact_idx" ON "deals" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "deals_stage_idx" ON "deals" USING btree ("stage_id");--> statement-breakpoint
CREATE INDEX "deals_assigned_idx" ON "deals" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "contact_notes_contact_idx" ON "contact_notes" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "contact_notes_conversation_idx" ON "contact_notes" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "contact_notes_tenant_idx" ON "contact_notes" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "custom_field_values_field_idx" ON "custom_field_values" USING btree ("field_id");--> statement-breakpoint
CREATE INDEX "custom_field_values_tenant_idx" ON "custom_field_values" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "custom_fields_tenant_name_idx" ON "custom_fields" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE INDEX "custom_fields_tenant_idx" ON "custom_fields" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "internal_conv_pair_idx" ON "internal_conversations" USING btree ("tenant_id","user_a","user_b");--> statement-breakpoint
CREATE INDEX "internal_conv_tenant_idx" ON "internal_conversations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "internal_conv_user_a_idx" ON "internal_conversations" USING btree ("user_a");--> statement-breakpoint
CREATE INDEX "internal_conv_user_b_idx" ON "internal_conversations" USING btree ("user_b");--> statement-breakpoint
CREATE INDEX "internal_msg_conv_idx" ON "internal_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "internal_msg_tenant_idx" ON "internal_messages" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "internal_msg_created_idx" ON "internal_messages" USING btree ("created_at");