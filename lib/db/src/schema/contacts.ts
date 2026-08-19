import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

export const channelTypeEnum = pgEnum("channel_type", [
  "whatsapp",
  "telegram",
]);

export const contactsTable = pgTable(
  "contacts",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenantsTable.id, { onDelete: "cascade" }),
    /** Canal de origem do contato. Um tenant pode operar so um ou ambos. */
    channel: channelTypeEnum("channel").notNull().default("whatsapp"),
    /**
     * Identificador nativo do canal: telefone no WhatsApp, chat_id no Telegram.
     * E a chave de deduplicacao junto com (tenantId, channel).
     */
    externalId: text("external_id").notNull(),
    /**
     * Telefone internacional sem @s.whatsapp.net (ex: 5511999999999).
     * Nulo em contatos de Telegram, que nao expoem telefone.
     */
    phone: text("phone"),
    name: text("name"),
    avatarUrl: text("avatar_url"),
    email: text("email"),
    /** Brazilian CPF, digits only (11 chars), unique per tenant when set */
    cpf: text("cpf"),
    /** How the contact was created: invite (admin pre-register), qr (QR page), organic (spontaneous inbound) */
    origin: text("origin", { enum: ["invite", "qr", "organic"] })
      .notNull()
      .default("organic"),
    company: text("company"),
    /** Clerk user id of the responsible agent */
    assignedTo: text("assigned_to"),
    notes: text("notes"),
    /** Arbitrary extra data for CRM integration */
    customData: jsonb("custom_data").$type<Record<string, unknown>>(),
    firstContactAt: timestamp("first_contact_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastContactAt: timestamp("last_contact_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("contacts_tenant_channel_external_idx").on(
      t.tenantId,
      t.channel,
      t.externalId,
    ),
    index("contacts_tenant_phone_idx").on(t.tenantId, t.phone),
    uniqueIndex("contacts_tenant_cpf_idx")
      .on(t.tenantId, t.cpf)
      .where(sql`${t.cpf} IS NOT NULL`),
    index("contacts_tenant_idx").on(t.tenantId),
  ],
);

export const insertContactSchema = createInsertSchema(contactsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectContactSchema = createSelectSchema(contactsTable);

export type Contact = typeof contactsTable.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
