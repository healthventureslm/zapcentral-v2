import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

/**
 * Internal 1:1 conversations between agents of the same tenant (PBX-style
 * ramal-to-ramal chat). Participants are stored in normalized order
 * (userA < userB lexicographically) so each pair has exactly one row.
 */
export const internalConversationsTable = pgTable(
  "internal_conversations",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenantsTable.id, { onDelete: "cascade" }),
    /** Lexicographically smaller clerkUserId */
    userA: text("user_a").notNull(),
    /** Lexicographically larger clerkUserId */
    userB: text("user_b").notNull(),
    /** Last time userA read this conversation */
    lastReadA: timestamp("last_read_a", { withTimezone: true }),
    /** Last time userB read this conversation */
    lastReadB: timestamp("last_read_b", { withTimezone: true }),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("internal_conv_pair_idx").on(t.tenantId, t.userA, t.userB),
    index("internal_conv_tenant_idx").on(t.tenantId),
    index("internal_conv_user_a_idx").on(t.userA),
    index("internal_conv_user_b_idx").on(t.userB),
  ],
);

export const internalMessagesTable = pgTable(
  "internal_messages",
  {
    id: serial("id").primaryKey(),
    conversationId: integer("conversation_id")
      .notNull()
      .references(() => internalConversationsTable.id, { onDelete: "cascade" }),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenantsTable.id, { onDelete: "cascade" }),
    senderId: text("sender_id").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("internal_msg_conv_idx").on(t.conversationId),
    index("internal_msg_tenant_idx").on(t.tenantId),
    index("internal_msg_created_idx").on(t.createdAt),
  ],
);

export const insertInternalMessageSchema = createInsertSchema(
  internalMessagesTable,
).omit({ id: true, createdAt: true });

export const selectInternalMessageSchema = createSelectSchema(
  internalMessagesTable,
);

export type InternalConversation =
  typeof internalConversationsTable.$inferSelect;
export type InternalMessage = typeof internalMessagesTable.$inferSelect;
export type InsertInternalMessage = z.infer<
  typeof insertInternalMessageSchema
>;
