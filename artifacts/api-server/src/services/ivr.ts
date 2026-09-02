/**
 * IVR (Interactive Voice Response) text-menu engine.
 *
 * Flow:
 *   new → (send welcome + menu) → ivr → (customer responds) → waiting → active
 *
 * If the customer sends an invalid option we retry up to MAX_ATTEMPTS times
 * before routing to a fallback department (first active department) or closing.
 */
import { db } from "@workspace/db";
import {
  conversationsTable,
  channelSettingsTable,
  departmentsTable,
  agentStatusesTable,
  messagesTable,
  departmentAgentsTable,
} from "@workspace/db";
import { eq, and, asc, sql, isNull } from "drizzle-orm";
import { sendText } from "./evolution";
import {
  ehContatoSimulado,
  entregaLocal,
  idSimulado,
  REMETENTE_SIMULADO,
} from "./simulado";
import {
  sendMessage as sendTelegramMessage,
  type BotaoDoMenu,
} from "./telegram";
import {
  whatsappInstancesTable,
  telegramBotsTable,
  contactsTable,
} from "@workspace/db";

const MAX_ATTEMPTS = 3;

export type IvrStep = "menu_sent" | "confirmed";

/** Build the IVR menu text from channel settings. */
export function buildMenuText(
  welcomeMessage: string,
  menuPrompt: string,
  options: { key: string; label: string }[],
): string {
  const lines = [
    welcomeMessage,
    "",
    menuPrompt,
    ...options.map((o) => `${o.key} - ${o.label}`),
  ];
  return lines.join("\n");
}

/**
 * O mesmo menu, sem a lista numerada.
 *
 * No WhatsApp a lista E o menu: nao ha botao, entao a pessoa precisa ler
 * "8 - UCI Medicos" para saber o que digitar. No Telegram os botoes ja dizem
 * isso, e mandar os dois faz a pessoa ler a mesma coisa duas vezes e ficar
 * na duvida sobre digitar ou tocar.
 *
 * As linhas sao removidas por igualdade exata com `${valor} - ${rotulo}`, que
 * e como buildMenuText as escreveu — os dois lados saem da mesma opcao, entao
 * nao ha texto do usuario sendo adivinhado aqui.
 */
export function semListaNumerada(
  texto: string,
  botoes: { rotulo: string; valor: string }[],
): string {
  const linhasDoMenu = new Set(botoes.map((b) => `${b.valor} - ${b.rotulo}`));
  return texto
    .split("\n")
    .filter((l) => !linhasDoMenu.has(l.trim()))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
}

/** Check if the current time is within working hours for the tenant. */
export function isWithinWorkingHours(settings: {
  workingHoursEnabled: boolean;
  workingHours?: {
    [day: string]: { start: string; end: string; active: boolean };
  } | null;
}): boolean {
  if (!settings.workingHoursEnabled) return true;
  if (!settings.workingHours) return true;

  const now = new Date();
  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const dayName = days[now.getDay()];
  const dayConfig = settings.workingHours[dayName ?? ""];
  if (!dayConfig?.active) return false;

  const [startH, startM] = dayConfig.start.split(":").map(Number);
  const [endH, endM] = dayConfig.end.split(":").map(Number);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = (startH ?? 0) * 60 + (startM ?? 0);
  const endMinutes = (endH ?? 0) * 60 + (endM ?? 0);
  return nowMinutes >= startMinutes && nowMinutes < endMinutes;
}

/**
 * As opcoes do menu que ainda apontam para um setor existente e ativo.
 *
 * O menu vive num JSON (`channel_settings.menu_options`) e o setor vive noutra
 * tabela: apagar ou desativar um setor deixa a opcao orfa. Oferecer uma opcao
 * orfa prende a pessoa — ela escolhe, e recebe "opcao invalida" com a mesma
 * opcao listada de novo.
 *
 * Uma fonte so, usada tanto para montar o menu quanto para reexibi-lo.
 */
export async function opcoesVivas(
  tenantId: number,
  opcoes: { key: string; label: string; departmentId: number }[],
): Promise<{ key: string; label: string; departmentId: number }[]> {
  if (opcoes.length === 0) return [];

  const ativos = await db
    .select({ id: departmentsTable.id })
    .from(departmentsTable)
    .where(
      and(
        eq(departmentsTable.tenantId, tenantId),
        eq(departmentsTable.status, "active"),
      ),
    );

  const vivos = new Set(ativos.map((d) => d.id));
  return opcoes.filter((o) => vivos.has(o.departmentId));
}

/**
 * Process an incoming message through the IVR state machine.
 * Returns the next conversation status.
 */
export async function processIvrMessage(
  conversationId: number,
  tenantId: number,
  incomingText: string,
): Promise<{
  action:
    | "send_menu"
    | "route_to_department"
    | "invalid_option"
    | "max_attempts"
    | "off_hours"
    | "noop";
  departmentId?: number;
  replyText?: string;
  /** Opcoes do menu como botoes. O Telegram as exibe; o WhatsApp ignora. */
  botoes?: BotaoDoMenu[];
}> {
  const [conversation] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, conversationId));

  if (!conversation) return { action: "noop" };

  // Already past IVR state
  if (!["new", "ivr"].includes(conversation.status)) {
    return { action: "noop" };
  }

  const [settings] = await db
    .select()
    .from(channelSettingsTable)
    .where(eq(channelSettingsTable.tenantId, tenantId));

  if (!settings) {
    // No settings configured — route to first active department directly
    const [dept] = await db
      .select({ id: departmentsTable.id })
      .from(departmentsTable)
      .where(
        and(
          eq(departmentsTable.tenantId, tenantId),
          eq(departmentsTable.status, "active"),
        ),
      )
      .limit(1);

    return {
      action: "route_to_department",
      departmentId: dept?.id,
    };
  }

  // Check working hours on new conversation
  if (conversation.status === "new") {
    if (!isWithinWorkingHours(settings)) {
      return {
        action: "off_hours",
        replyText: settings.offHoursMessage,
      };
    }

    // Send menu
    const vivas = await opcoesVivas(
      tenantId,
      settings.menuOptions as {
        key: string;
        label: string;
        departmentId: number;
      }[],
    );

    // Menu vazio (nenhum setor do menu existe mais) nao pode virar uma frase
    // truncada no celular da pessoa. Sem opcao para oferecer, ela vai direto
    // para a fila do primeiro setor ativo.
    if (vivas.length === 0) {
      const [primeiro] = await db
        .select({ id: departmentsTable.id })
        .from(departmentsTable)
        .where(
          and(
            eq(departmentsTable.tenantId, tenantId),
            eq(departmentsTable.status, "active"),
          ),
        )
        .orderBy(asc(departmentsTable.id))
        .limit(1);

      return {
        action: "route_to_department",
        ...(primeiro ? { departmentId: primeiro.id } : {}),
        replyText: settings.welcomeMessage,
      };
    }

    const menuText = buildMenuText(
      settings.welcomeMessage,
      settings.menuPrompt,
      vivas,
    );
    return {
      action: "send_menu",
      replyText: menuText,
      botoes: vivas.map((o) => ({ rotulo: o.label, valor: o.key })),
    };
  }

  // Conversation is in "ivr" state — customer is responding to menu
  const options = settings.menuOptions as {
    key: string;
    label: string;
    departmentId: number;
  }[];
  const matched = options.find(
    (o) => o.key.trim() === incomingText.trim(),
  );

  if (matched) {
    // O menu guarda o id do setor num JSON separado, que pode ficar apontando
    // para um setor apagado. Rotear direto quebraria a chave estrangeira de
    // `conversations.department_id`: o webhook estoura, a resposta nunca sai, e
    // a conversa fica travada no menu para sempre. Conferir aqui custa uma
    // consulta e transforma uma configuracao velha em "opcao invalida", que o
    // fluxo ja sabe tratar.
    const [aindaExiste] = await db
      .select({ id: departmentsTable.id })
      .from(departmentsTable)
      .where(
        and(
          eq(departmentsTable.id, matched.departmentId),
          eq(departmentsTable.tenantId, tenantId),
          eq(departmentsTable.status, "active"),
        ),
      )
      .limit(1);

    if (aindaExiste) {
      return {
        action: "route_to_department",
        departmentId: matched.departmentId,
      };
    }
  }

  // Invalid option
  const attempts = (conversation.ivrAttempts ?? 0) + 1;
  if (attempts >= MAX_ATTEMPTS) {
    // Exceeded max attempts — route to first active department
    const [dept] = await db
      .select({ id: departmentsTable.id })
      .from(departmentsTable)
      .where(
        and(
          eq(departmentsTable.tenantId, tenantId),
          eq(departmentsTable.status, "active"),
        ),
      )
      .limit(1);

    return {
      action: "max_attempts",
      departmentId: dept?.id,
      replyText:
        "Não conseguimos identificar sua opção. Você será direcionado para um atendente.",
    };
  }

  const vivas = await opcoesVivas(tenantId, options);
  const optionList = vivas.map((o) => `${o.key} - ${o.label}`).join("\n");
  return {
    action: "invalid_option",
    replyText: `Opção inválida. Por favor, escolha uma das opções:\n${optionList}`,
    botoes: vivas.map((o) => ({ rotulo: o.label, valor: o.key })),
  };
}

/**
 * Nome da instancia WhatsApp conectada do tenant (null se nao houver).
 */
export async function getTenantInstanceName(
  tenantId: number,
): Promise<string | null> {
  const [instance] = await db
    .select({ instanceName: whatsappInstancesTable.instanceName })
    .from(whatsappInstancesTable)
    .where(
      and(
        eq(whatsappInstancesTable.tenantId, tenantId),
        eq(whatsappInstancesTable.status, "connected"),
      ),
    )
    .limit(1);

  return instance?.instanceName ?? null;
}

/** Bot do Telegram conectado do tenant (null se nao houver). */
export async function getTenantTelegramBot(tenantId: number): Promise<{
  botToken: string;
  botId: string | null;
  botUsername: string | null;
} | null> {
  const [bot] = await db
    .select({
      botToken: telegramBotsTable.botToken,
      botId: telegramBotsTable.botId,
      botUsername: telegramBotsTable.botUsername,
    })
    .from(telegramBotsTable)
    .where(
      and(
        eq(telegramBotsTable.tenantId, tenantId),
        eq(telegramBotsTable.status, "connected"),
      ),
    )
    .limit(1);

  return bot ?? null;
}

/** Referencia normalizada da mensagem enviada, independente do canal. */
export interface SentMessageRef {
  messageId: string;
}

/**
 * Envia texto para o contato da conversa e registra a mensagem.
 *
 * O canal e resolvido a partir do contato da conversa, entao os chamadores
 * (IVR, fechamento de atendimento, pesquisa de satisfacao) funcionam em
 * WhatsApp e Telegram sem saber qual esta em uso. Retorna null quando o canal
 * nao esta conectado ou o envio falha — o chamador trata isso como "nao
 * entregue".
 */
export async function sendTenantMessage(
  tenantId: number,
  conversationId: number,
  to: string | null,
  text: string,
  from: string,
  /** Botoes do menu. So o Telegram os exibe; no WhatsApp sao ignorados. */
  botoes?: BotaoDoMenu[],
): Promise<SentMessageRef | null> {
  const [target] = await db
    .select({
      channel: contactsTable.channel,
      externalId: contactsTable.externalId,
    })
    .from(conversationsTable)
    .innerJoin(contactsTable, eq(conversationsTable.contactId, contactsTable.id))
    .where(eq(conversationsTable.id, conversationId))
    .limit(1);

  // Sem contato resolvido caimos no identificador passado pelo chamador.
  const channel = target?.channel ?? "whatsapp";
  const destination = target?.externalId ?? to;
  if (!destination) return null;

  try {
    let messageId: string;
    let fromIdentifier = from;
    // O que o painel grava tem que ser o que a pessoa recebeu. No Telegram o
    // menu sai sem a lista numerada, entao gravar `text` mostraria ao
    // atendente uma mensagem que o cliente nunca viu.
    let textoEnviado = text;

    // Modo simulacao: grava e emite sem chamar provedor nenhum. Sem isto as
    // falas do robo (menu, fora de horario, agradecimento) sao descartadas em
    // silencio pelo catch la embaixo, e a conversa aparece pela metade.
    //
    // O contato do simulador entra aqui inclusive no Telegram: o chat_id dele
    // e ficticio, e `sendMessage` devolveria erro do proprio Telegram. E o que
    // permite demonstrar os dois canais na mesma fila sem bot configurado.
    if (
      ehContatoSimulado(destination) ||
      (entregaLocal() && channel !== "telegram")
    ) {
      messageId = idSimulado("out");
      fromIdentifier = from || REMETENTE_SIMULADO;
    } else if (channel === "telegram") {
      const bot = await getTenantTelegramBot(tenantId);
      if (!bot) return null;
      textoEnviado = botoes?.length ? semListaNumerada(text, botoes) : text;
      const sent = await sendTelegramMessage(
        bot.botToken,
        destination,
        textoEnviado,
        botoes,
      );
      messageId = String(sent.message_id);
      fromIdentifier = bot.botId ?? bot.botUsername ?? "telegram-bot";
    } else {
      const instanceName = await getTenantInstanceName(tenantId);
      if (!instanceName) return null;
      const sent = await sendText(instanceName, destination, text);
      messageId = sent.key.id;
    }

    await db.insert(messagesTable).values({
      conversationId,
      tenantId,
      messageId,
      fromPhone: fromIdentifier,
      toPhone: destination,
      type: "text",
      content: textoEnviado,
      direction: "outbound",
      status: "sent",
      timestamp: new Date(),
    });

    return { messageId };
  } catch {
    return null;
  }
}

/**
 * Auto-assign a waiting conversation to an available agent (round-robin or least-load).
 */
/**
 * Ha alguem do ramal com o painel aberto e vaga livre?
 *
 * Serve para o produto nao mentir para quem acabou de entrar na fila.
 * "Assim que alguem estiver livre, respondemos por aqui" e verdade quando ha
 * equipe conectada e mentira quando nao ha ninguem — e a pessoa fica esperando
 * uma resposta que nao vem, de madrugada, sem saber que nao vem.
 *
 * E a mesma condicao que `tryAutoAssign` usa para escolher o atendente. Ela
 * vive aqui em vez de ser deduzida do `null` daquela funcao porque `manual`
 * devolve `null` sem sequer olhar a equipe: no modo manual ha gente de plantao,
 * ela e que escolhe a conversa. Confundir os dois casos diria "nao ha ninguem"
 * para uma central cheia de atendentes.
 */
export async function haAtendenteDisponivel(
  tenantId: number,
  departmentId: number,
): Promise<boolean> {
  const [linha] = await db
    .select({ quantos: sql<number>`COUNT(*)::int` })
    .from(agentStatusesTable)
    .innerJoin(
      departmentAgentsTable,
      and(
        eq(departmentAgentsTable.clerkUserId, agentStatusesTable.clerkUserId),
        eq(departmentAgentsTable.departmentId, departmentId),
      ),
    )
    .where(
      and(
        eq(agentStatusesTable.tenantId, tenantId),
        eq(agentStatusesTable.status, "available"),
        sql`${agentStatusesTable.activeConversations} < ${agentStatusesTable.maxConversations}`,
      ),
    );

  return (linha?.quantos ?? 0) > 0;
}

export async function tryAutoAssign(
  tenantId: number,
  conversationId: number,
  departmentId: number,
  distributionMode: "manual" | "round_robin" | "least_load",
): Promise<string | null> {
  if (distributionMode === "manual") return null;

  // Find available agents who belong to this specific department AND are under capacity.
  // Join department_agents to restrict to members of the requested department only.
  const agents = await db
    .select({
      clerkUserId: agentStatusesTable.clerkUserId,
      activeConversations: agentStatusesTable.activeConversations,
      maxConversations: agentStatusesTable.maxConversations,
    })
    .from(agentStatusesTable)
    .innerJoin(
      departmentAgentsTable,
      and(
        eq(departmentAgentsTable.clerkUserId, agentStatusesTable.clerkUserId),
        eq(departmentAgentsTable.departmentId, departmentId),
      ),
    )
    .where(
      and(
        eq(agentStatusesTable.tenantId, tenantId),
        eq(agentStatusesTable.status, "available"),
        sql`${agentStatusesTable.activeConversations} < ${agentStatusesTable.maxConversations}`,
      ),
    )
    .orderBy(asc(agentStatusesTable.activeConversations));

  if (agents.length === 0) return null;

  let selectedAgent: string;
  if (distributionMode === "least_load") {
    selectedAgent = agents[0]!.clerkUserId;
  } else {
    // round_robin: pick based on conversation ID to distribute evenly
    selectedAgent = agents[conversationId % agents.length]!.clerkUserId;
  }

  // Atomic assign + conditional capacity increment in one transaction.
  // Two concurrent auto-assigns for DIFFERENT conversations can both select the same
  // last-slot agent. The capacity increment therefore uses a conditional WHERE
  // (status != 'offline' AND active < max) — if the agent's last slot was consumed
  // by the time we get here, the increment finds no row, we throw, the whole
  // transaction rolls back (conversation claim undone), and we return null so the
  // conversation stays in 'waiting'.
  let assigned: string | null = null;
  try {
    assigned = await db.transaction(async (tx) => {
      // 1. Conditional conversation claim
      const [updated] = await tx
        .update(conversationsTable)
        .set({ assignedTo: selectedAgent, status: "active", updatedAt: new Date() })
        .where(
          and(
            eq(conversationsTable.id, conversationId),
            eq(conversationsTable.status, "waiting"),
            isNull(conversationsTable.assignedTo),
          ),
        )
        .returning({ id: conversationsTable.id });

      if (!updated) return null; // Another assign claimed it first

      // 2. Conditional capacity increment — prevents concurrent over-allocation
      const [capacityOk] = await tx
        .update(agentStatusesTable)
        .set({
          activeConversations: sql`${agentStatusesTable.activeConversations} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(agentStatusesTable.clerkUserId, selectedAgent),
            eq(agentStatusesTable.tenantId, tenantId),
            sql`${agentStatusesTable.status} != 'offline'`,
            sql`${agentStatusesTable.activeConversations} < ${agentStatusesTable.maxConversations}`,
          ),
        )
        .returning({ uid: agentStatusesTable.clerkUserId });

      if (!capacityOk) {
        // Agent's last slot was filled by a concurrent assignment — roll back conversation claim
        throw new Error("CAPACITY_RACE");
      }

      return selectedAgent;
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    if (e.message === "CAPACITY_RACE") return null; // Expected contention; leave in waiting
    throw err;
  }

  return assigned;
}

/**
 * Distribui as conversas que ficaram paradas na fila dos setores deste agente.
 *
 * Existe porque `tryAutoAssign` so e chamado quando chega mensagem nova. Uma
 * conversa que caiu na fila sem ninguem conectado nunca mais seria oferecida:
 * ela ja passou pelo IVR, entao mensagens seguintes do contato retornam `noop`.
 *
 * Chamado quando o agente fica disponivel. Nao garante que as conversas fiquem
 * com ELE — o `tryAutoAssign` mantem o rodizio e as travas de capacidade, e
 * pode entregar a outro agente do mesmo setor. O que importa e que a fila anda.
 */
export interface Atribuicao {
  agente: string;
  conversa: typeof conversationsTable.$inferSelect;
}

export async function distribuirFilaParada(
  tenantId: number,
  clerkUserId: string,
): Promise<Atribuicao[]> {
  const [settings] = await db
    .select({ distributionMode: channelSettingsTable.distributionMode })
    .from(channelSettingsTable)
    .where(eq(channelSettingsTable.tenantId, tenantId))
    .limit(1);

  const mode = settings?.distributionMode ?? "manual";
  if (mode === "manual") return [];

  const paradas = await db
    .select({
      id: conversationsTable.id,
      departmentId: conversationsTable.departmentId,
    })
    .from(conversationsTable)
    .innerJoin(
      departmentAgentsTable,
      and(
        eq(departmentAgentsTable.departmentId, conversationsTable.departmentId),
        eq(departmentAgentsTable.tenantId, tenantId),
        eq(departmentAgentsTable.clerkUserId, clerkUserId),
      ),
    )
    .where(
      and(
        eq(conversationsTable.tenantId, tenantId),
        eq(conversationsTable.status, "waiting"),
        isNull(conversationsTable.assignedTo),
      ),
    )
    // Mais antiga primeiro: quem esperou mais e atendido antes.
    .orderBy(asc(conversationsTable.lastMessageAt))
    // Teto de seguranca: um agente voltando nao deve disparar centenas de
    // transacoes de uma vez. O resto sai na proxima mensagem ou na proxima
    // conexao de alguem do setor.
    .limit(20);

  // Devolve as atribuicoes em vez de emitir aqui: quem emite e o socket, e
  // importa-lo neste modulo fecharia um ciclo (socket.ts ja importa este).
  const feitas: Atribuicao[] = [];
  for (const conversa of paradas) {
    if (!conversa.departmentId) continue;
    const agente = await tryAutoAssign(
      tenantId,
      conversa.id,
      conversa.departmentId,
      mode,
    );
    if (!agente) continue;

    const [atualizada] = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, conversa.id))
      .limit(1);

    if (atualizada) feitas.push({ agente, conversa: atualizada });
  }

  return feitas;
}
