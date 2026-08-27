/**
 * A palavra MENU — a saida de quem ficou preso no ramal errado.
 *
 * Sem isto, quem escolhe "3" por engano, ou cai num ramal que nao resolve o
 * problema dele, nao tem como sair: o robo so escuta durante o menu, e depois
 * disso toda mensagem vira texto para um atendente que pode nunca responder. A
 * unica saida era desistir e ligar no telefone — exatamente o que o produto
 * existe para evitar.
 *
 * Por que ha confirmacao. "MENU" tambem e uma palavra que aparece em conversa
 * de verdade ("vi no menu do site que voces atendem convenio"). Sem o SIM/NAO,
 * uma mensagem dessas derrubaria um atendimento em curso e devolveria a pessoa
 * para o comeco. O passo a mais custa uma mensagem e evita um estrago mudo.
 *
 * A confirmacao pendente e guardada em `conversations.ivr_step`, que ja existe
 * e e texto livre — de proposito, para esta funcionalidade nao exigir migration
 * na vespera da apresentacao. O contador de insistencia usa `ivr_attempts`,
 * pelo mesmo motivo.
 */
import { db } from "@workspace/db";
import {
  conversationsTable,
  departmentsTable,
  channelSettingsTable,
  agentStatusesTable,
  type Conversation,
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import {
  buildMenuText,
  opcoesVivas,
  sendTenantMessage,
} from "./ivr";
import type { BotaoDoMenu } from "./telegram";
import { emitToTenant, emitToAgent } from "./socket";

/** Marca de confirmacao pendente, gravada em `ivr_step`. */
const CONFIRMANDO = "confirmar_menu";

/** Quantas respostas fora de SIM/NAO antes de assumir NAO e seguir. */
const MAX_INSISTENCIA = 2;

/** Tira acento, espaco e caixa, para comparar o que a pessoa realmente digitou. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

export function ehPalavraMenu(texto: string): boolean {
  return normalizar(texto) === "menu";
}

/** Status em que a pessoa ja passou do robo e pode pedir para voltar. */
const DEPOIS_DO_ROBO = ["waiting", "active"];

interface Contexto {
  tenantId: number;
  conversation: Conversation;
  texto: string;
  /** Identificador do contato no canal (telefone ou chat_id). */
  externalId: string;
  /** Identificador do lado da central, para o registro da mensagem. */
  remetente: string;
}

/**
 * Trata a palavra MENU e a confirmacao dela.
 *
 * Devolve `true` quando consumiu a mensagem — o chamador nao deve seguir com o
 * fluxo normal. `false` significa "nao era comigo".
 */
export async function tratarPalavraMenu(ctx: Contexto): Promise<boolean> {
  const { conversation } = ctx;

  if (conversation.ivrStep === CONFIRMANDO) {
    return responderConfirmacao(ctx);
  }

  if (!DEPOIS_DO_ROBO.includes(conversation.status)) return false;
  if (!ehPalavraMenu(ctx.texto)) return false;

  const nomeDoSetor = await nomeDoRamal(conversation.departmentId);

  await db
    .update(conversationsTable)
    .set({ ivrStep: CONFIRMANDO, ivrAttempts: 0, updatedAt: new Date() })
    .where(eq(conversationsTable.id, conversation.id));

  await enviar(
    ctx,
    `Você está falando com *${nomeDoSetor}*.\n` +
      "Deseja encerrar este atendimento e voltar ao menu?\n" +
      "Responda *SIM* ou *NÃO*.",
    [
      { rotulo: "Sim, voltar ao menu", valor: "SIM" },
      { rotulo: "Não, continuar", valor: "NÃO" },
    ],
  );

  return true;
}

async function responderConfirmacao(ctx: Contexto): Promise<boolean> {
  const resposta = normalizar(ctx.texto);

  if (resposta === "sim" || resposta === "s") {
    await devolverAoMenu(ctx);
    return true;
  }

  const insistencia = (ctx.conversation.ivrAttempts ?? 0) + 1;

  // Qualquer coisa que nao seja SIM segue o atendimento. Na duvida, o padrao
  // seguro e NAO: manter a conversa onde esta e reversivel — a pessoa digita
  // MENU de novo. Derrubar um atendimento por engano nao e.
  if (resposta === "nao" || resposta === "n" || insistencia >= MAX_INSISTENCIA) {
    await seguirComoEstava(ctx);
    return true;
  }

  await db
    .update(conversationsTable)
    .set({ ivrAttempts: insistencia, updatedAt: new Date() })
    .where(eq(conversationsTable.id, ctx.conversation.id));

  await enviar(
    ctx,
    "Não entendi. Responda *SIM* para voltar ao menu ou *NÃO* para continuar o atendimento.",
    [
      { rotulo: "Sim, voltar ao menu", valor: "SIM" },
      { rotulo: "Não, continuar", valor: "NÃO" },
    ],
  );

  return true;
}

/** NAO: limpa a pendencia, avisa a pessoa e avisa quem estava atendendo. */
async function seguirComoEstava(ctx: Contexto): Promise<void> {
  const [atualizada] = await db
    .update(conversationsTable)
    .set({ ivrStep: null, ivrAttempts: 0, updatedAt: new Date() })
    .where(eq(conversationsTable.id, ctx.conversation.id))
    .returning();

  await enviar(ctx, "Tudo bem, seguimos por aqui. 👍");

  if (ctx.conversation.assignedTo) {
    emitToAgent(ctx.conversation.assignedTo, "conversation_updated", {
      conversation: atualizada,
    });
  }
}

/**
 * SIM: solta o ramal e o atendente, e manda o menu de novo.
 *
 * A conversa continua sendo A MESMA — nao e encerrada e recriada. O invariante
 * 3 do PROJETO.md manda uma conversa aberta por contato, e fechar esta para
 * abrir outra abriria a janela em que o contato tem duas.
 */
async function devolverAoMenu(ctx: Contexto): Promise<void> {
  const { tenantId, conversation } = ctx;

  // Devolve a vaga de quem estava atendendo, senao ele fica carregando uma
  // conversa que nao tem mais e some da fila por capacidade.
  if (conversation.assignedTo) {
    await db
      .update(agentStatusesTable)
      .set({
        activeConversations: sql`GREATEST(0, ${agentStatusesTable.activeConversations} - 1)`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(agentStatusesTable.clerkUserId, conversation.assignedTo),
          eq(agentStatusesTable.tenantId, tenantId),
        ),
      );
  }

  const [settings] = await db
    .select()
    .from(channelSettingsTable)
    .where(eq(channelSettingsTable.tenantId, tenantId))
    .limit(1);

  const vivas = settings
    ? await opcoesVivas(
        tenantId,
        settings.menuOptions as {
          key: string;
          label: string;
          departmentId: number;
        }[],
      )
    : [];

  // Menu vazio nao pode virar uma frase truncada no celular da pessoa. Sem
  // opcao para oferecer, o certo e nao ter prometido a volta: seguimos onde
  // estavamos e dizemos por que.
  if (vivas.length === 0) {
    await db
      .update(conversationsTable)
      .set({ ivrStep: null, ivrAttempts: 0, updatedAt: new Date() })
      .where(eq(conversationsTable.id, conversation.id));
    await enviar(
      ctx,
      "No momento não há outro ramal disponível. Seguimos por aqui.",
    );
    return;
  }

  const [atualizada] = await db
    .update(conversationsTable)
    .set({
      status: "ivr",
      departmentId: null,
      assignedTo: null,
      ivrStep: "menu_sent",
      ivrAttempts: 0,
      updatedAt: new Date(),
    })
    .where(eq(conversationsTable.id, conversation.id))
    .returning();

  await enviar(
    ctx,
    buildMenuText(
      "Sem problema, vamos recomeçar.",
      settings?.menuPrompt ?? "Com qual equipe você precisa falar?",
      vivas,
    ),
    vivas.map((o) => ({ rotulo: o.label, valor: o.key })),
  );

  emitToTenant(tenantId, "conversation_updated", { conversation: atualizada });
  if (conversation.assignedTo) {
    emitToAgent(conversation.assignedTo, "conversation_updated", {
      conversation: atualizada,
    });
  }
}

async function nomeDoRamal(departmentId: number | null): Promise<string> {
  if (!departmentId) return "nossa equipe";
  const [setor] = await db
    .select({ name: departmentsTable.name })
    .from(departmentsTable)
    .where(eq(departmentsTable.id, departmentId))
    .limit(1);
  return setor?.name ?? "nossa equipe";
}

function enviar(
  ctx: Contexto,
  texto: string,
  botoes?: BotaoDoMenu[],
): Promise<unknown> {
  return sendTenantMessage(
    ctx.tenantId,
    ctx.conversation.id,
    ctx.externalId,
    texto,
    ctx.remetente,
    botoes,
  ).catch(() => null);
}
