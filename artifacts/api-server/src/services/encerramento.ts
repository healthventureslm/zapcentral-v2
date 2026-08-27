/**
 * Encerramento de atendimento — o caminho unico.
 *
 * Existe porque encerrar uma conversa nao e mudar um status: e mandar a
 * despedida, mandar a pesquisa de satisfacao, devolver a vaga do atendente e
 * avisar o painel. Sao quatro efeitos, e a ordem entre eles importa.
 *
 * Havia um so chamador (o botao do atendente). Agora ha dois — o botao e a
 * varredura de inatividade — e um segundo caminho com a mesma logica copiada
 * divergiria na primeira mudanca: a proxima pessoa a mexer na pesquisa mexeria
 * num dos dois, e o outro continuaria com a regra velha sem ninguem perceber.
 */
import { db } from "@workspace/db";
import {
  conversationsTable,
  contactsTable,
  channelSettingsTable,
  whatsappInstancesTable,
  agentStatusesTable,
  type Conversation,
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { sendTenantMessage } from "./ivr";
import { emitToTenant } from "./socket";

/** Quem puxou o gatilho. Decide a despedida e quem recebe a pesquisa. */
export type MotivoDeEncerramento = "atendente" | "inatividade";

const DESPEDIDA_POR_INATIVIDADE =
  "Encerramos este atendimento porque ficou parado por um tempo. " +
  "Se ainda precisar de ajuda, e so mandar uma nova mensagem que comecamos de novo.";

const PERGUNTA_DA_PESQUISA =
  "Como você avalia o nosso atendimento? Responda com uma nota de 1 a 5 " +
  "(5 = excelente). Se quiser, escreva um comentário junto com a nota.";

export interface OpcoesDeEncerramento {
  tenantId: number;
  conversationId: number;
  /** clerkUserId de quem encerrou. Nulo quando foi o sistema. */
  encerradaPor: string | null;
  /** Observacao de fechamento, quando houver. */
  nota?: string | null;
  motivo: MotivoDeEncerramento;
}

/**
 * Encerra a conversa e roda os quatro efeitos.
 *
 * Devolve a conversa encerrada, ou `null` quando ela nao existe, nao e da
 * central informada, ou ja estava fechada — os tres casos em que nao ha nada a
 * fazer e nenhum deles e erro: a varredura e o botao podem chegar juntos na
 * mesma conversa.
 */
export async function encerrarConversa(
  opcoes: OpcoesDeEncerramento,
): Promise<Conversation | null> {
  const { tenantId, conversationId, encerradaPor, motivo } = opcoes;

  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(
      and(
        eq(conversationsTable.id, conversationId),
        eq(conversationsTable.tenantId, tenantId),
      ),
    )
    .limit(1);

  if (!conv || conv.status === "closed") return null;

  /**
   * Quem recebe a pergunta de nota.
   *
   * O atendente encerrando pergunta sempre: quem esperou na fila foi atendido,
   * mesmo que a solucao tenha saido por telefone e ninguem tenha digitado nada.
   *
   * A varredura NAO pergunta quando a conversa morreu sem chegar a ninguem.
   * Nao ha o que avaliar, e a nota de um atendimento que nunca aconteceu pesaria
   * igual a de um que aconteceu — a media do painel viraria a media do abandono.
   */
  const perguntarNota = motivo === "atendente" || conv.assignedTo !== null;

  const [settings] = await db
    .select({ closingMessage: channelSettingsTable.closingMessage })
    .from(channelSettingsTable)
    .where(eq(channelSettingsTable.tenantId, tenantId))
    .limit(1);

  const [contact] = await db
    .select({ phone: contactsTable.phone })
    .from(contactsTable)
    .where(eq(contactsTable.id, conv.contactId))
    .limit(1);

  // Grava o estado fechado ANTES de enviar qualquer coisa: o contato pode
  // responder no instante em que a pesquisa e entregue, e o webhook precisa
  // encontrar uma conversa fechada e elegivel. Se o envio falhar depois,
  // desfazemos o `surveySentAt` — nunca o contrario.
  let [updated] = await db
    .update(conversationsTable)
    .set({
      status: "closed",
      closedAt: new Date(),
      closedBy: encerradaPor,
      closingNote:
        opcoes.nota ??
        (motivo === "inatividade"
          ? "Encerrada automaticamente por inatividade."
          : null),
      surveySentAt: contact && perguntarNota ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(conversationsTable.id, conversationId))
    .returning();

  if (contact) {
    const [instance] = await db
      .select({ phoneNumber: whatsappInstancesTable.phoneNumber })
      .from(whatsappInstancesTable)
      .where(eq(whatsappInstancesTable.tenantId, tenantId))
      .limit(1);

    const remetente = instance?.phoneNumber ?? "";

    // A despedida da inatividade nao e a configurada pela central: a
    // configurada agradece o contato, e agradecer alguem que foi largado na
    // fila e pior do que nao dizer nada. Esta explica o que aconteceu e diz
    // como voltar.
    const despedida =
      motivo === "inatividade"
        ? DESPEDIDA_POR_INATIVIDADE
        : (settings?.closingMessage ?? null);

    if (despedida) {
      await sendTenantMessage(
        tenantId,
        conversationId,
        contact.phone,
        despedida,
        remetente,
      ).catch(() => null);
    }

    if (perguntarNota) {
      const enviada = await sendTenantMessage(
        tenantId,
        conversationId,
        contact.phone,
        PERGUNTA_DA_PESQUISA,
        remetente,
      ).catch(() => null);

      if (enviada === null) {
        // A pesquisa nunca chegou ao contato — retira a elegibilidade, senao a
        // proxima mensagem dele seria lida como nota de uma pergunta que ele
        // nao recebeu.
        const [revertida] = await db
          .update(conversationsTable)
          .set({ surveySentAt: null, updatedAt: new Date() })
          .where(eq(conversationsTable.id, conversationId))
          .returning();
        updated = revertida;
      }
    }
  }

  // Devolve a vaga do atendente. Sem isto ele fica invisivel para a fila com um
  // contador que nunca desce.
  if (conv.assignedTo) {
    await db
      .update(agentStatusesTable)
      .set({
        activeConversations: sql`GREATEST(0, ${agentStatusesTable.activeConversations} - 1)`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(agentStatusesTable.clerkUserId, conv.assignedTo),
          eq(agentStatusesTable.tenantId, tenantId),
        ),
      );
  }

  emitToTenant(tenantId, "conversation_updated", { conversation: updated });

  return updated ?? null;
}
