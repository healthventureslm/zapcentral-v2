/**
 * Processamento de mensagem recebida, comum a todos os canais.
 *
 * WhatsApp (Evolution) e Telegram (Bot API) tem payloads muito diferentes, mas
 * o que acontece depois e identico: deduplicar, resolver o contato, capturar
 * avaliacao pendente, abrir ou reaproveitar a conversa, gravar, notificar e
 * rodar o IVR. Cada webhook normaliza o payload para `InboundMessage` e chama
 * `handleInboundMessage`.
 */
import { db } from "@workspace/db";
import {
  contactsTable,
  conversationsTable,
  messagesTable,
  channelSettingsTable,
  tenantsTable,
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { extractQrMarker, matchesQrMarker } from "../lib/qrMarker";
import { processIvrMessage, sendTenantMessage, tryAutoAssign } from "./ivr";
import { emitToTenant, emitToAgent } from "./socket";

export type InboundChannel = "whatsapp" | "telegram";

export type InboundType =
  | "text"
  | "image"
  | "audio"
  | "video"
  | "document"
  | "location"
  | "sticker";

export interface InboundMessage {
  tenantId: number;
  channel: InboundChannel;
  /** Telefone no WhatsApp, chat_id no Telegram. Chave de deduplicacao. */
  externalId: string;
  /** Telefone real quando o canal expoe (WhatsApp); null no Telegram. */
  phone: string | null;
  displayName: string | null;
  /** Id da mensagem no canal de origem — garante idempotencia. */
  messageId: string;
  timestamp: Date;
  /** Nosso lado da conversa: numero da instancia ou id do bot. */
  toIdentifier: string;
  type: InboundType;
  content: string | null;
  mediaUrl?: string | null;
  mediaCaption?: string | null;
  mediaMimeType?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  /**
   * Se true, procura o marcador "QR-xxxxxx" no texto para atribuir origem.
   * Hoje so o WhatsApp tem pagina publica de QR.
   */
  attributeQrMarker?: boolean;
}

/**
 * Processa a mensagem recebida ate o fim do fluxo.
 * Idempotente: reentregas do mesmo `messageId` sao descartadas.
 */
export async function handleInboundMessage(msg: InboundMessage): Promise<void> {
  const { tenantId, channel, externalId, messageId, timestamp } = msg;

  // -------------------------------------------------------------------------
  // Idempotencia — o canal pode reentregar o mesmo evento
  // -------------------------------------------------------------------------
  const [existing] = await db
    .select({ id: messagesTable.id })
    .from(messagesTable)
    .where(
      and(
        eq(messagesTable.tenantId, tenantId),
        eq(messagesTable.messageId, messageId),
      ),
    )
    .limit(1);

  if (existing) return;

  // -------------------------------------------------------------------------
  // Contato
  // -------------------------------------------------------------------------
  const [contact] = await db
    .insert(contactsTable)
    .values({
      tenantId,
      channel,
      externalId,
      phone: msg.phone,
      name: msg.displayName,
      lastContactAt: timestamp,
    })
    .onConflictDoUpdate({
      target: [
        contactsTable.tenantId,
        contactsTable.channel,
        contactsTable.externalId,
      ],
      set: {
        name: msg.displayName ?? undefined,
        lastContactAt: timestamp,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!contact) throw new Error("Failed to upsert contact");

  // -------------------------------------------------------------------------
  // Atribuicao por QR: a pagina publica anexa um marcador "QR-xxxxxx" (6
  // primeiros hex do share token do tenant) na mensagem pre-preenchida. Um
  // marcador valido sobrepoe 'organic' E 'invite' — escanear o QR e um evento
  // de canal definitivo. Uma vez 'qr', permanece 'qr'.
  // -------------------------------------------------------------------------
  if (
    msg.attributeQrMarker &&
    contact.origin !== "qr" &&
    msg.type === "text" &&
    msg.content
  ) {
    const marker = extractQrMarker(msg.content);
    if (marker) {
      const [tenant] = await db
        .select({ qrShareToken: tenantsTable.qrShareToken })
        .from(tenantsTable)
        .where(eq(tenantsTable.id, tenantId))
        .limit(1);
      if (matchesQrMarker(msg.content, tenant?.qrShareToken)) {
        await db
          .update(contactsTable)
          .set({ origin: "qr", updatedAt: new Date() })
          .where(eq(contactsTable.id, contact.id));
      }
    }
  }

  // -------------------------------------------------------------------------
  // Conversa aberta (criada adiante se nao houver)
  // -------------------------------------------------------------------------
  let [conversation] = await db
    .select()
    .from(conversationsTable)
    .where(
      and(
        eq(conversationsTable.tenantId, tenantId),
        eq(conversationsTable.contactId, contact.id),
        sql`${conversationsTable.status} NOT IN ('closed')`,
      ),
    )
    .limit(1);

  // -------------------------------------------------------------------------
  // Pesquisa de satisfacao: SO quando nao ha conversa aberta (senao "3" pode
  // ser opcao de menu ou resposta ao agente). Havendo conversa fechada
  // recentemente com pesquisa enviada ha menos de 24h e resposta comecando com
  // 1-5, registra a nota (o resto do texto vira comentario) e encerra aqui.
  // Qualquer outra resposta segue o fluxo normal.
  // -------------------------------------------------------------------------
  if (!conversation && msg.type === "text" && msg.content) {
    const ratingMatch = /^\s*([1-5])\b[\s.,;:-]*([\s\S]*)$/.exec(msg.content);
    if (ratingMatch) {
      const [pendingSurvey] = await db
        .select({
          id: conversationsTable.id,
          assignedTo: conversationsTable.assignedTo,
        })
        .from(conversationsTable)
        .where(
          and(
            eq(conversationsTable.tenantId, tenantId),
            eq(conversationsTable.contactId, contact.id),
            eq(conversationsTable.status, "closed"),
            sql`${conversationsTable.surveySentAt} IS NOT NULL`,
            sql`${conversationsTable.rating} IS NULL`,
            sql`${conversationsTable.surveySentAt} > NOW() - INTERVAL '24 hours'`,
          ),
        )
        .orderBy(sql`${conversationsTable.surveySentAt} DESC`)
        .limit(1);

      if (pendingSurvey) {
        const rating = Number(ratingMatch[1]);
        const comment = (ratingMatch[2] ?? "").trim() || null;

        // Atomico: so a primeira nota vale
        const [rated] = await db
          .update(conversationsTable)
          .set({ rating, ratingComment: comment, updatedAt: new Date() })
          .where(
            and(
              eq(conversationsTable.id, pendingSurvey.id),
              sql`${conversationsTable.rating} IS NULL`,
            ),
          )
          .returning({ id: conversationsTable.id });

        if (rated) {
          await db.insert(messagesTable).values({
            conversationId: pendingSurvey.id,
            tenantId,
            messageId,
            fromPhone: externalId,
            toPhone: msg.toIdentifier,
            type: "text",
            content: msg.content,
            direction: "inbound",
            status: "received",
            timestamp,
          });

          await sendTenantMessage(
            tenantId,
            pendingSurvey.id,
            externalId,
            "Obrigado pela sua avaliação!",
            msg.toIdentifier,
          ).catch(() => null);

          emitToTenant(tenantId, "conversation_updated", {
            conversationId: pendingSurvey.id,
            rating,
          });

          return;
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Abre conversa se nao houver
  // -------------------------------------------------------------------------
  if (!conversation) {
    const [newConv] = await db
      .insert(conversationsTable)
      .values({
        tenantId,
        contactId: contact.id,
        status: "new",
        lastMessageAt: timestamp,
      })
      .returning();
    conversation = newConv!;
  }

  // -------------------------------------------------------------------------
  // Grava a mensagem
  // -------------------------------------------------------------------------
  const [savedMsg] = await db
    .insert(messagesTable)
    .values({
      conversationId: conversation.id,
      tenantId,
      messageId,
      fromPhone: externalId,
      toPhone: msg.toIdentifier,
      type: msg.type,
      content: msg.content,
      mediaUrl: msg.mediaUrl ?? null,
      mediaCaption: msg.mediaCaption ?? null,
      mediaMimeType: msg.mediaMimeType ?? null,
      latitude: msg.latitude ?? null,
      longitude: msg.longitude ?? null,
      direction: "inbound",
      status: "received",
      timestamp,
    })
    .returning();

  emitToTenant(tenantId, "new_message", {
    message: savedMsg,
    conversationId: conversation.id,
    contact,
  });

  if (conversation.assignedTo) {
    emitToAgent(conversation.assignedTo, "new_message", {
      message: savedMsg,
      conversationId: conversation.id,
    });
  }

  await db
    .update(conversationsTable)
    .set({ lastMessageAt: timestamp, updatedAt: new Date() })
    .where(eq(conversationsTable.id, conversation.id));

  // -------------------------------------------------------------------------
  // IVR
  // -------------------------------------------------------------------------
  if (
    !["new", "ivr"].includes(conversation.status) ||
    msg.type !== "text" ||
    !msg.content
  ) {
    return;
  }

  const result = await processIvrMessage(conversation.id, tenantId, msg.content);

  switch (result.action) {
    case "send_menu": {
      await sendTenantMessage(
        tenantId,
        conversation.id,
        externalId,
        result.replyText ?? "",
        msg.toIdentifier,
      );
      await db
        .update(conversationsTable)
        .set({
          status: "ivr",
          ivrStep: "menu_sent",
          ivrAttempts: 0,
          updatedAt: new Date(),
        })
        .where(eq(conversationsTable.id, conversation.id));
      break;
    }
    case "off_hours": {
      await sendTenantMessage(
        tenantId,
        conversation.id,
        externalId,
        result.replyText ?? "",
        msg.toIdentifier,
      );
      await db
        .update(conversationsTable)
        .set({
          status: "closed",
          closedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(conversationsTable.id, conversation.id));
      break;
    }
    case "route_to_department":
    case "max_attempts": {
      if (result.replyText) {
        await sendTenantMessage(
          tenantId,
          conversation.id,
          externalId,
          result.replyText,
          msg.toIdentifier,
        );
      }

      const [settings] = await db
        .select({ distributionMode: channelSettingsTable.distributionMode })
        .from(channelSettingsTable)
        .where(eq(channelSettingsTable.tenantId, tenantId))
        .limit(1);

      const mode = settings?.distributionMode ?? "manual";
      const deptId = result.departmentId;

      // Transiciona para 'waiting' ANTES do tryAutoAssign — ele exige a
      // conversa em 'waiting' com assignedTo=null para poder reivindica-la.
      await db
        .update(conversationsTable)
        .set({
          departmentId: deptId ?? null,
          status: "waiting",
          assignedTo: null,
          ivrStep: null,
          updatedAt: new Date(),
        })
        .where(eq(conversationsTable.id, conversation.id));

      const assignedAgent = deptId
        ? await tryAutoAssign(tenantId, conversation.id, deptId, mode)
        : null;

      const updatedConv = await db
        .select()
        .from(conversationsTable)
        .where(eq(conversationsTable.id, conversation.id))
        .then((r) => r[0]);

      emitToTenant(tenantId, "conversation_updated", {
        conversation: updatedConv,
      });
      if (assignedAgent) {
        emitToAgent(assignedAgent, "conversation_assigned", {
          conversation: updatedConv,
        });
      }
      break;
    }
    case "invalid_option": {
      await sendTenantMessage(
        tenantId,
        conversation.id,
        externalId,
        result.replyText ?? "",
        msg.toIdentifier,
      );
      await db
        .update(conversationsTable)
        .set({
          ivrAttempts: sql`${conversationsTable.ivrAttempts} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(conversationsTable.id, conversation.id));
      break;
    }
  }
}
