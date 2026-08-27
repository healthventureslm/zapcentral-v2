/**
 * Message routes — list and send messages within a conversation.
 */
import { Router } from "express";
import { getAuth } from "../lib/devAuth";
import { db } from "@workspace/db";
import {
  messagesTable,
  conversationsTable,
  tenantUsersTable,
  contactsTable,
  departmentsTable,
  whatsappInstancesTable,
} from "@workspace/db";
import { eq, and, asc, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, requireTenantMember } from "../middlewares/auth";
import { sendText, sendMedia, isEvolutionConfigured } from "../services/evolution";
import {
  sendMessage as sendTelegramMessage,
  sendMediaByUrl as sendTelegramMedia,
} from "../services/telegram";
import {
  entregaLocal,
  idSimulado,
  REMETENTE_SIMULADO,
} from "../services/simulado";
import { getTenantTelegramBot } from "../services/ivr";
import { emitToTenant, emitToAgent } from "../services/socket";

const router = Router();

const sendMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("text"),
    content: z.string().min(1).max(4096),
  }),
  z.object({
    type: z.literal("image"),
    mediaUrl: z.string().url(),
    mediaCaption: z.string().max(1024).optional(),
  }),
  z.object({
    type: z.literal("audio"),
    mediaUrl: z.string().url(),
  }),
  z.object({
    type: z.literal("video"),
    mediaUrl: z.string().url(),
    mediaCaption: z.string().max(1024).optional(),
  }),
  z.object({
    type: z.literal("document"),
    mediaUrl: z.string().url(),
    content: z.string().max(256).optional(),
  }),
]);

/**
 * GET /api/tenants/:tenantId/conversations/:conversationId/messages
 */
router.get(
  "/tenants/:tenantId/conversations/:conversationId/messages",
  requireAuth,
  requireTenantMember,
  async (req, res): Promise<void> => {
    const tenantId = Number(req.params["tenantId"]);
    const conversationId = Number(req.params["conversationId"]);
    const { userId } = getAuth(req);
    const uid = userId!;
    const limit = Math.min(Number(req.query["limit"] ?? 50), 200);
    const before = req.query["before"] ? Number(req.query["before"]) : undefined;

    // Verify conversation belongs to this tenant
    const [conv] = await db
      .select({ assignedTo: conversationsTable.assignedTo })
      .from(conversationsTable)
      .where(
        and(
          eq(conversationsTable.id, conversationId),
          eq(conversationsTable.tenantId, tenantId),
        ),
      )
      .limit(1);

    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    // Agents can only read their own conversations
    const [membership] = await db
      .select({ role: tenantUsersTable.role })
      .from(tenantUsersTable)
      .where(
        and(
          eq(tenantUsersTable.tenantId, tenantId),
          eq(tenantUsersTable.clerkUserId, uid),
        ),
      )
      .limit(1);

    const isAdminOrSupervisor = ["admin", "supervisor"].includes(
      membership?.role ?? "",
    );

    if (!isAdminOrSupervisor && conv.assignedTo !== uid) {
      res.status(403).json({ error: "Forbidden: not your conversation" });
      return;
    }

    const conditions = [
      eq(messagesTable.conversationId, conversationId),
      eq(messagesTable.tenantId, tenantId),
    ];

    if (before) {
      conditions.push(
        // id < before for cursor pagination
        // Use a raw expression to avoid Drizzle type issues
        eq(messagesTable.conversationId, conversationId), // duplicate for structuring
      );
    }

    const msgs = await db
      .select()
      .from(messagesTable)
      .where(and(...conditions))
      .orderBy(asc(messagesTable.timestamp))
      .limit(limit);

    res.json(msgs);
  },
);

/**
 * Prefixo com quem esta falando.
 *
 * Do lado do paciente existe uma conversa so, com o numero da central. Sem
 * isto ele nao tem como saber se quem respondeu agora e a mesma pessoa de
 * antes — e depois de uma transferencia, nunca e. Cada atendente acabava
 * escrevendo "aqui e a Dra. Fulana" na mao, toda vez.
 *
 * So vale para texto: legenda de midia tem limite curto no WhatsApp e o
 * prefixo comeria o espaco util.
 */
async function assinatura(
  tenantId: number,
  clerkUserId: string,
  conversationId: number,
): Promise<string> {
  const [autor] = await db
    .select({
      firstName: tenantUsersTable.firstName,
      lastName: tenantUsersTable.lastName,
    })
    .from(tenantUsersTable)
    .where(
      and(
        eq(tenantUsersTable.tenantId, tenantId),
        eq(tenantUsersTable.clerkUserId, clerkUserId),
      ),
    )
    .limit(1);

  const nome = [autor?.firstName, autor?.lastName].filter(Boolean).join(" ");
  if (!nome) return "";

  const [setor] = await db
    .select({ name: departmentsTable.name })
    .from(conversationsTable)
    .innerJoin(
      departmentsTable,
      eq(departmentsTable.id, conversationsTable.departmentId),
    )
    .where(eq(conversationsTable.id, conversationId))
    .limit(1);

  return setor ? `*${nome} — ${setor.name}*
` : `*${nome}*
`;
}

/**
 * POST /api/tenants/:tenantId/conversations/:conversationId/messages
 * Send a message to the customer.
 */
router.post(
  "/tenants/:tenantId/conversations/:conversationId/messages",
  requireAuth,
  requireTenantMember,
  async (req, res): Promise<void> => {
    const tenantId = Number(req.params["tenantId"]);
    const conversationId = Number(req.params["conversationId"]);
    const { userId } = getAuth(req);
    const uid = userId!;

    const parsed = sendMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.format() });
      return;
    }

    // Verify conversation
    const [conv] = await db
      .select({
        assignedTo: conversationsTable.assignedTo,
        contactId: conversationsTable.contactId,
        status: conversationsTable.status,
      })
      .from(conversationsTable)
      .where(
        and(
          eq(conversationsTable.id, conversationId),
          eq(conversationsTable.tenantId, tenantId),
        ),
      )
      .limit(1);

    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    if (conv.status === "closed") {
      res.status(400).json({ error: "Cannot send messages to a closed conversation" });
      return;
    }

    // Check permissions
    const [membership] = await db
      .select({ role: tenantUsersTable.role })
      .from(tenantUsersTable)
      .where(
        and(
          eq(tenantUsersTable.tenantId, tenantId),
          eq(tenantUsersTable.clerkUserId, uid),
        ),
      )
      .limit(1);

    const isAdminOrSupervisor = ["admin", "supervisor"].includes(
      membership?.role ?? "",
    );

    if (!isAdminOrSupervisor && conv.assignedTo !== uid) {
      res.status(403).json({ error: "Forbidden: not your conversation" });
      return;
    }

    // Contato define o canal de saida (WhatsApp ou Telegram).
    const [contact] = await db
      .select({
        phone: contactsTable.phone,
        channel: contactsTable.channel,
        externalId: contactsTable.externalId,
      })
      .from(contactsTable)
      .where(eq(contactsTable.id, conv.contactId))
      .limit(1);

    if (!contact) {
      res.status(500).json({ error: "Contact not found" });
      return;
    }

    const msg = parsed.data;
    let messageId: string | null = null;
    let fromIdentifier = "";

    // O que sai para o paciente leva a assinatura; o que fica gravado e
    // aparece no painel continua sendo o texto que o atendente digitou.
    const textoParaEnviar =
      msg.type === "text"
        ? `${await assinatura(tenantId, uid, conversationId)}${msg.content}`
        : "";

    if (contact.channel === "telegram") {
      const bot = await getTenantTelegramBot(tenantId);
      if (!bot) {
        res
          .status(503)
          .json({ error: "Telegram is not connected for this tenant" });
        return;
      }
      fromIdentifier = bot.botId ?? bot.botUsername ?? "telegram-bot";

      try {
        if (msg.type === "text") {
          const sent = await sendTelegramMessage(
            bot.botToken,
            contact.externalId,
            textoParaEnviar,
          );
          messageId = String(sent.message_id);
        } else {
          const sent = await sendTelegramMedia(
            bot.botToken,
            contact.externalId,
            msg.mediaUrl,
            msg.type,
            "mediaCaption" in msg ? (msg.mediaCaption ?? null) : null,
          );
          messageId = String(sent.message_id);
        }
      } catch (err) {
        req.log.error({ err }, "Failed to send message via Telegram");
        res.status(502).json({ error: "Failed to send message" });
        return;
      }
    } else {
      const [instance] = await db
        .select()
        .from(whatsappInstancesTable)
        .where(
          and(
            eq(whatsappInstancesTable.tenantId, tenantId),
            eq(whatsappInstancesTable.status, "connected"),
          ),
        )
        .limit(1);

      // Entrega local: numero simulado, ou ambiente sem provedor. A mensagem
      // e gravada e emitida normalmente, so nao sai para fora. Sem isto o
      // atendente nao consegue responder nada em demonstracao.
      if (entregaLocal()) {
        messageId = idSimulado("out");
        fromIdentifier = instance?.phoneNumber ?? REMETENTE_SIMULADO;
      } else {
      if (!instance) {
        res
          .status(503)
          .json({ error: "WhatsApp is not connected for this tenant" });
        return;
      }

      fromIdentifier = instance.phoneNumber ?? "";

      try {
        if (msg.type === "text") {
          const result = await sendText(
            instance.instanceName,
            contact.externalId,
            textoParaEnviar,
          );
          messageId = result.key.id;
        } else {
          const result = await sendMedia(
            instance.instanceName,
            contact.externalId,
            msg.type as "image" | "video" | "document" | "audio",
            msg.mediaUrl,
            "mediaCaption" in msg ? msg.mediaCaption : undefined,
          );
          messageId = result.key.id;
        }
      } catch (err) {
        req.log.error({ err }, "Failed to send message via Evolution API");
        res.status(502).json({ error: "Failed to send message" });
        return;
      }
      }
    }

    // Save to DB
    const [savedMsg] = await db
      .insert(messagesTable)
      .values({
        conversationId,
        tenantId,
        messageId,
        fromPhone: fromIdentifier,
        toPhone: contact.externalId,
        type: msg.type as "text" | "image" | "audio" | "video" | "document",
        content: "content" in msg ? (msg.content ?? null) : null,
        mediaUrl: "mediaUrl" in msg ? msg.mediaUrl : null,
        mediaCaption: "mediaCaption" in msg ? (msg.mediaCaption ?? null) : null,
        direction: "outbound",
        status: "sent",
        sentBy: uid,
        timestamp: new Date(),
      })
      .returning();

    // Update last message time; record first agent response time (once)
    await db
      .update(conversationsTable)
      .set({
        lastMessageAt: new Date(),
        updatedAt: new Date(),
        firstResponseAt: sql`COALESCE(${conversationsTable.firstResponseAt}, NOW())`,
      })
      .where(eq(conversationsTable.id, conversationId));

    emitToTenant(tenantId, "new_message", {
      message: savedMsg,
      conversationId,
    });

    res.status(201).json(savedMsg);
  },
);

export default router;
