-- Habilita RLS sem policies (deny-all) em todas as tabelas da aplicacao.
-- O ZapCentral conecta pelo role 'postgres', dono das tabelas, que ignora RLS.
-- Isso fecha o acesso via PostgREST (anon/authenticated) sem afetar a aplicacao.
ALTER TABLE "agent_statuses" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "channel_settings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "contact_notes" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "contact_tags" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "contacts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "conversation_tags" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "conversations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "custom_field_values" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "custom_fields" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "deal_stages" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "deals" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "department_agents" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "departments" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "internal_conversations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "internal_messages" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "platform_config" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "quick_replies" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "tags" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "tenant_users" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "whatsapp_instances" ENABLE ROW LEVEL SECURITY;
