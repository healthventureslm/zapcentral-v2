/**
 * Simulador de atendimento — demonstrar a central sem celular nenhum.
 *
 * Por que existe: a demonstracao do produto dependia de parear um WhatsApp de
 * verdade. Quando o pareamento nao acontece — chip indisponivel, QR expirado,
 * rede do cliente bloqueando —, nao sobra nada para mostrar: o painel abre com
 * historico morto e o fluxo que e o coracao do produto (menu, fila, atendimento,
 * transferencia, nota) fica invisivel.
 *
 * O que este arquivo NAO faz: nao simula o fluxo. Ele injeta a mensagem no
 * mesmo `handleInboundMessage` que o webhook do WhatsApp e o do Telegram usam.
 * O menu, o roteamento, a fila, a atribuicao e a pesquisa de satisfacao sao os
 * de producao — o unico atalho e a mensagem nao ter vindo de fora. Um simulador
 * que reimplementasse o fluxo demonstraria o simulador, nao o produto.
 *
 * O contato criado aqui carrega o prefixo `sim-` no `externalId`, e e isso que
 * faz `simulado.ts` gravar a resposta em vez de tentar entregar num numero que
 * nao existe.
 */
import { Router } from "express";
import { db } from "@workspace/db";
import {
  contactsTable,
  conversationsTable,
  messagesTable,
} from "@workspace/db";
import { and, eq, inArray, like } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, requireTenantAdmin } from "../middlewares/auth";
import { handleInboundMessage } from "../services/inbound";
import { PREFIXO_SIMULADO } from "../services/simulado";
import { emitToTenant } from "../services/socket";

const router = Router();

/**
 * As pessoas que o simulador sabe ser.
 *
 * Ficam no servidor, e nao no painel, porque o `externalId` precisa ser estavel
 * entre uma mensagem e a proxima: e ele que identifica o contato e mantem a
 * conversa aberta. Gerar no navegador faria cada recarga da pagina virar um
 * paciente novo.
 *
 * Dois canais de proposito: e a demonstracao de que a fila e o mesmo balcao,
 * independente de onde o paciente escreveu.
 */
export const PERSONAS = [
  {
    id: "whatsapp-1",
    nome: "Joana Ribeiro",
    canal: "whatsapp" as const,
    telefone: "5521970001001",
    descricao: "Filha de paciente internado. Escreve pelo WhatsApp.",
  },
  {
    id: "whatsapp-2",
    nome: "Dr. Henrique Salles",
    canal: "whatsapp" as const,
    telefone: "5521970001002",
    descricao: "Médico externo que encaminha pacientes. WhatsApp.",
  },
  {
    id: "telegram-1",
    nome: "Marina Alcântara",
    canal: "telegram" as const,
    telefone: "874100031",
    descricao: "Paciente que usa Telegram. Cai na MESMA fila.",
  },
];

type Persona = (typeof PERSONAS)[number];

/** `externalId` do contato desta persona. Estavel e sempre prefixado. */
function externalIdDaPersona(p: Persona): string {
  return `${PREFIXO_SIMULADO}${p.canal}-${p.telefone}`;
}

const mensagemSchema = z.object({
  personaId: z.string().min(1),
  texto: z.string().min(1).max(1000),
});

/**
 * GET /api/tenants/:tenantId/simulador/personas
 */
router.get(
  "/tenants/:tenantId/simulador/personas",
  requireAuth,
  requireTenantAdmin,
  async (_req, res): Promise<void> => {
    res.json(
      PERSONAS.map((p) => ({
        id: p.id,
        nome: p.nome,
        canal: p.canal,
        telefone: p.telefone,
        descricao: p.descricao,
      })),
    );
  },
);

/**
 * POST /api/tenants/:tenantId/simulador/mensagem
 *
 * Manda uma mensagem como se a persona tivesse escrito de fora, e devolve a
 * conversa com tudo que foi trocado — inclusive o que o robo respondeu.
 */
router.post(
  "/tenants/:tenantId/simulador/mensagem",
  requireAuth,
  requireTenantAdmin,
  async (req, res): Promise<void> => {
    const tenantId = Number(req.params["tenantId"]);
    const parsed = mensagemSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Entrada inválida." });
      return;
    }

    const persona = PERSONAS.find((p) => p.id === parsed.data.personaId);
    if (!persona) {
      res.status(404).json({ error: "Persona não encontrada." });
      return;
    }

    const externalId = externalIdDaPersona(persona);

    await handleInboundMessage({
      tenantId,
      channel: persona.canal,
      externalId,
      // O telefone aparece no painel e na ficha do contato. No Telegram fica
      // nulo, igual ao canal de verdade — la nao existe telefone.
      phone: persona.canal === "whatsapp" ? persona.telefone : null,
      displayName: persona.nome,
      // Unico por mensagem: e ele que garante a idempotencia do inbound. Sem
      // sufixo aleatorio, duas mensagens iguais no mesmo milissegundo seriam
      // tratadas como reentrega e a segunda desapareceria.
      messageId: `${PREFIXO_SIMULADO}in-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
      timestamp: new Date(),
      toIdentifier: "simulador",
      type: "text",
      content: parsed.data.texto,
    });

    const conversa = await conversaAtualDaPersona(tenantId, externalId);
    res.status(201).json(conversa);
  },
);

/**
 * GET /api/tenants/:tenantId/simulador/conversa/:personaId
 *
 * O estado atual, para o painel poder acompanhar o que o atendente responde do
 * outro lado sem o simulador ter mandado nada.
 */
router.get(
  "/tenants/:tenantId/simulador/conversa/:personaId",
  requireAuth,
  requireTenantAdmin,
  async (req, res): Promise<void> => {
    const tenantId = Number(req.params["tenantId"]);
    const persona = PERSONAS.find((p) => p.id === req.params["personaId"]);
    if (!persona) {
      res.status(404).json({ error: "Persona não encontrada." });
      return;
    }
    res.json(await conversaAtualDaPersona(tenantId, externalIdDaPersona(persona)));
  },
);

/**
 * POST /api/tenants/:tenantId/simulador/limpar
 *
 * Apaga tudo que o simulador criou nesta central. Serve para ensaiar a
 * demonstracao mais de uma vez sem herdar a conversa anterior — sem isto, a
 * segunda vez comeca no meio do fluxo e o menu nao aparece.
 *
 * So alcanca contato com o prefixo `sim-`: paciente de verdade nao e tocado.
 */
router.post(
  "/tenants/:tenantId/simulador/limpar",
  requireAuth,
  requireTenantAdmin,
  async (req, res): Promise<void> => {
    const tenantId = Number(req.params["tenantId"]);

    const simulados = await db
      .select({ id: contactsTable.id })
      .from(contactsTable)
      .where(
        and(
          eq(contactsTable.tenantId, tenantId),
          like(contactsTable.externalId, `${PREFIXO_SIMULADO}%`),
        ),
      );

    if (simulados.length === 0) {
      res.json({ conversasApagadas: 0 });
      return;
    }

    const contactIds = simulados.map((c) => c.id);

    const conversas = await db
      .select({ id: conversationsTable.id })
      .from(conversationsTable)
      .where(
        and(
          eq(conversationsTable.tenantId, tenantId),
          inArray(conversationsTable.contactId, contactIds),
        ),
      );

    if (conversas.length > 0) {
      const ids = conversas.map((c) => c.id);
      // As mensagens saem primeiro: `messages.conversation_id` referencia a
      // conversa, e apagar a conversa antes esbarraria na chave estrangeira.
      await db
        .delete(messagesTable)
        .where(inArray(messagesTable.conversationId, ids));
      await db
        .delete(conversationsTable)
        .where(inArray(conversationsTable.id, ids));
    }

    await db.delete(contactsTable).where(inArray(contactsTable.id, contactIds));

    // O painel de quem atende esta com a lista na tela. Sem o aviso, a conversa
    // apagada continua aparecendo ate o proximo intervalo de busca.
    emitToTenant(tenantId, "conversation_updated", { reason: "simulador" });

    res.json({ conversasApagadas: conversas.length });
  },
);

/** Conversa viva (ou a ultima encerrada) da persona, com as mensagens. */
async function conversaAtualDaPersona(tenantId: number, externalId: string) {
  const [contato] = await db
    .select({ id: contactsTable.id, nome: contactsTable.name })
    .from(contactsTable)
    .where(
      and(
        eq(contactsTable.tenantId, tenantId),
        eq(contactsTable.externalId, externalId),
      ),
    )
    .limit(1);

  if (!contato) return { conversaId: null, status: null, mensagens: [] };

  const conversas = await db
    .select({
      id: conversationsTable.id,
      status: conversationsTable.status,
      departmentId: conversationsTable.departmentId,
    })
    .from(conversationsTable)
    .where(
      and(
        eq(conversationsTable.tenantId, tenantId),
        eq(conversationsTable.contactId, contato.id),
      ),
    );

  // A conversa viva e a que interessa; sem nenhuma viva, a ultima encerrada
  // ainda serve para mostrar a nota que acabou de ser dada.
  const viva = conversas.find((c) => c.status !== "closed");
  const alvo = viva ?? conversas[conversas.length - 1];
  if (!alvo) return { conversaId: null, status: null, mensagens: [] };

  const mensagens = await db
    .select({
      id: messagesTable.id,
      direction: messagesTable.direction,
      content: messagesTable.content,
      timestamp: messagesTable.timestamp,
      sentBy: messagesTable.sentBy,
    })
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, alvo.id))
    .orderBy(messagesTable.timestamp, messagesTable.id);

  return {
    conversaId: alvo.id,
    status: alvo.status,
    departmentId: alvo.departmentId,
    mensagens,
  };
}

export default router;
