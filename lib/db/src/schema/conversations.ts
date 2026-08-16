import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";
import { contactsTable } from "./contacts";
import { departmentsTable } from "./departments";

export const conversationStatusEnum = pgEnum("conversation_status", [
  "new",      // created, IVR not started
  "ivr",      // IVR menu sent, waiting for customer choice
  "waiting",  // in department queue, not yet assigned
  "active",   // assigned to agent
  "closed",   // conversation ended
]);

export const conversationsTable = pgTable(
  "conversations",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenantsTable.id, { onDelete: "cascade" }),
    contactId: integer("contact_id")
      .notNull()
      .references(() => contactsTable.id, { onDelete: "restrict" }),
    departmentId: integer("department_id")
      .references(() => departmentsTable.id, { onDelete: "set null" }),
    /** clerkUserId of assigned agent */
    assignedTo: text("assigned_to"),
    status: conversationStatusEnum("status").notNull().default("new"),
    /** IVR state tracking: step name + attempts */
    ivrStep: text("ivr_step"),
    ivrAttempts: integer("ivr_attempts").notNull().default(0),
    queuePosition: integer("queue_position"),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Timestamp of the first outbound message sent by the assigned agent */
    firstResponseAt: timestamp("first_response_at", { withTimezone: true }),
    /** When the post-service satisfaction survey was sent (null = not sent) */
    surveySentAt: timestamp("survey_sent_at", { withTimezone: true }),
    /** Customer satisfaction rating 1–5 (null = not answered) */
    rating: integer("rating"),
    /** Optional free-text comment sent alongside the rating */
    ratingComment: text("rating_comment"),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    /** clerkUserId who closed the conversation */
    closedBy: text("closed_by"),
    closingNote: text("closing_note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("conversations_tenant_status_idx").on(t.tenantId, t.status),
    index("conversations_contact_idx").on(t.contactId),
    index("conversations_assigned_idx").on(t.assignedTo),
    index("conversations_dept_idx").on(t.departmentId),
    index("conversations_tenant_idx").on(t.tenantId),
  ],
);

export const insertConversationSchema = createInsertSchema(
  conversationsTable,
).omit({ id: true, createdAt: true, updatedAt: true });

export const selectConversationSchema = createSelectSchema(conversationsTable);

export type Conversation = typeof conversationsTable.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
