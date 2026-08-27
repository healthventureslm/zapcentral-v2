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
  departmentsTable,
  tenantsTable,
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { extractQrMarker, matchesQrMarker } from "../lib/qrMarker";
import {
  processIvrMessage,
  sendTenantMessage,
  tryAutoAssign,
  haAtendenteDisponivel,
} from "./ivr";
import { tratarPalavraMenu } from "./voltarAoMenu";
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
  /**
   * True quando veio de um toque em botao do menu, nao de digitacao.
   *
   * Importa por causa da pesquisa de satisfacao: o valor do botao e "1".
   * Sem esta marca, tocar num menu antigo do historico depois de a conversa
   * ter sido encerrada registraria **nota 1** e responderia "Obrigado pela
   * sua avaliacao!" — envenenando a metrica de satisfacao com um toque que
   * nao era avaliacao nenhuma.
   */
  origemBotao?: boolean;
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
  if (!conversation && !msg.origemBotao && msg.type === "text" && msg.content) {
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
  // Palavra MENU — vem ANTES do IVR de proposito.
  //
  // Ela age justamente nos status que o IVR ignora ('waiting' e 'active'), e a
  // confirmacao pendente precisa consumir a resposta antes que ela seja tratada
  // como mensagem comum para o atendente. Se `tratarPalavraMenu` consumiu, nao
  // ha mais nada a fazer com esta mensagem.
  // -------------------------------------------------------------------------
  if (msg.type === "text" && msg.content) {
    const consumida = await tratarPalavraMenu({
      tenantId,
      conversation,
      texto: msg.content,
      externalId,
      remetente: msg.toIdentifier,
    });
    if (consumida) return;
  }

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
        result.botoes,
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

      // Confirmar o ramal escolhido.
      //
      // Sem isto, quem digita "1" recebe SILENCIO ate um atendente digitar
      // alguma coisa. Do lado do paciente e indistinguivel de sistema quebrado:
      // ele nao sabe se a escolha foi aceita, em que ramal caiu, nem se tem
      // alguem do outro lado. Era o unico ponto do fluxo em que o produto
      // deixava de responder.
      //
      // A fala muda conforme haja atendente ou nao: prometer "ja chamamos
      // alguem" para uma fila vazia seria mentira, e dizer "aguarde na fila"
      // para quem ja foi atribuido faria o paciente esperar sem motivo.
      if (deptId) {
        const [setor] = await db
          .select({ name: departmentsTable.name })
          .from(departmentsTable)
          .where(eq(departmentsTable.id, deptId))
          .limit(1);

        const nomeDoSetor = setor?.name ?? "atendimento";

        let aviso: string;
        if (assignedAgent) {
          aviso =
            `Pronto! Você está em *${nomeDoSetor}*.
` +
            "Já chamamos alguém da equipe — responderemos por aqui.";
        } else {
          // Posicao na fila: conta quem chegou antes neste mesmo ramal e ainda
          // espera. Quem sabe que e o terceiro espera; quem nao sabe nada
          // desiste e liga no telefone, que e o que o produto quer evitar.
          const [fila] = await db
            .select({ antes: sql<number>`COUNT(*)::int` })
            .from(conversationsTable)
            .where(
              and(
                eq(conversationsTable.tenantId, tenantId),
                eq(conversationsTable.departmentId, deptId),
                eq(conversationsTable.status, "waiting"),
                sql`${conversationsTable.createdAt} < (
                  SELECT created_at FROM conversations WHERE id = ${conversation.id}
                )`,
              ),
            );

          const posicao = (fila?.antes ?? 0) + 1;

          // "Assim que alguem estiver livre" e verdade quando ha equipe
          // conectada, e mentira quando nao ha ninguem. Quem escreve as 3h da
          // manha para um ramal sem plantao merece saber que a resposta vem no
          // horario seguinte — e nao ficar olhando o celular a noite inteira.
          //
          // A conversa continua na fila: quando alguem abrir o painel,
          // `distribuirFilaParada()` a entrega. O que muda e so a promessa.
          const temGente = await haAtendenteDisponivel(tenantId, deptId);

          aviso =
            `Pronto! Você está na fila de *${nomeDoSetor}*.
` +
            (posicao > 1
              ? `Há ${posicao - 1} pessoa(s) na sua frente. `
              : "") +
            (temGente
              ? "Assim que alguém da equipe estiver livre, respondemos por aqui."
              : "No momento não há ninguém da equipe disponível. " +
                "Sua mensagem está guardada e será respondida assim que houver atendimento.") +
            "\n\nSe preferir falar com outra equipe, responda *MENU*.";
        }

        await sendTenantMessage(
          tenantId,
          conversation.id,
          externalId,
          aviso,
          msg.toIdentifier,
        );
      }

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
        result.botoes,
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
