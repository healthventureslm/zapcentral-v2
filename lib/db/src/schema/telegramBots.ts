import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

export const telegramBotStatusEnum = pgEnum("telegram_bot_status", [
  "connected",
  "disconnected",
  "error",
]);

/**
 * Bot do Telegram por tenant — analogo a `whatsapp_instances`.
 * Um tenant pode ter apenas WhatsApp, apenas Telegram, ou ambos.
 */
export const telegramBotsTable = pgTable(
  "telegram_bots",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenantsTable.id, { onDelete: "cascade" }),
    /** Token do BotFather. Concede controle total do bot — tratar como segredo. */
    botToken: text("bot_token").notNull(),
    /** Id numerico do bot, retornado por getMe */
    botId: text("bot_id"),
    /** @handle sem o arroba */
    botUsername: text("bot_username"),
    botFirstName: text("bot_first_name"),
    status: telegramBotStatusEnum("status").notNull().default("disconnected"),
    /** Enviado pelo Telegram no header X-Telegram-Bot-Api-Secret-Token */
    webhookSecret: text("webhook_secret"),
    /** URL publica registrada no setWebhook (muda a cada restart do ngrok) */
    webhookUrl: text("webhook_url"),
    lastError: text("last_error"),
    lastConnectedAt: timestamp("last_connected_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("telegram_bots_tenant_idx").on(t.tenantId),
    index("telegram_bots_status_idx").on(t.status),
  ],
);

export const insertTelegramBotSchema = createInsertSchema(
  telegramBotsTable,
).omit({ id: true, createdAt: true, updatedAt: true });

export const selectTelegramBotSchema = createSelectSchema(telegramBotsTable);

export type TelegramBot = typeof telegramBotsTable.$inferSelect;
export type InsertTelegramBot = z.infer<typeof insertTelegramBotSchema>;
