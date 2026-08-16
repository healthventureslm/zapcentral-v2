import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

export const contactsTable = pgTable(
  "contacts",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenantsTable.id, { onDelete: "cascade" }),
    /** International phone number without @s.whatsapp.net (e.g. 5511999999999) */
    phone: text("phone").notNull(),
    name: text("name"),
    avatarUrl: text("avatar_url"),
    email: text("email"),
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
    uniqueIndex("contacts_tenant_phone_idx").on(t.tenantId, t.phone),
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
