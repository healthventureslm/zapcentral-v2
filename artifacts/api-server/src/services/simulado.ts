/**
 * Entrega local — o que fazer quando a mensagem nao deve sair para fora.
 *
 * Duas situacoes caem aqui:
 *
 * 1. **Ambiente sem provedor de WhatsApp.** Sem Evolution API o produto ficava
 *    mudo de um jeito perverso: as falas do robo eram descartadas em silencio
 *    (`sendTenantMessage` grava a mensagem so DEPOIS do envio dar certo, e a
 *    falha caia num `catch` vazio) e a resposta do atendente devolvia 503. A
 *    conversa aparecia pela metade e ninguem conseguia responder — sem log,
 *    sem rastro.
 *
 * 2. **Contato do simulador.** O simulador injeta mensagem no fluxo real para
 *    demonstrar o atendimento sem celular nenhum. O numero dele nao existe no
 *    WhatsApp: tentar enviar de verdade falharia, e a falha voltaria como
 *    conversa pela metade — justamente o defeito do item 1, de novo. O contato
 *    simulado e reconhecido pelo prefixo do `externalId`.
 *
 * Nos dois casos a mensagem e gravada e emitida no socket como sempre; o que
 * nao acontece e a chamada ao provedor.
 */
import { isEvolutionConfigured } from "./evolution";

/**
 * Prefixo do `externalId` dos contatos criados pelo simulador.
 *
 * E o que separa "conversa de demonstracao" de "paciente de verdade" em todo o
 * resto do sistema, sem precisar de coluna nova no banco. Precisa ser algo que
 * nunca colida com telefone (WhatsApp) nem com chat_id (Telegram), que sao
 * sempre numericos.
 */
export const PREFIXO_SIMULADO = "sim-";

/** true quando o contato foi criado pelo simulador. */
export function ehContatoSimulado(externalId: string | null): boolean {
  return !!externalId && externalId.startsWith(PREFIXO_SIMULADO);
}

/**
 * true quando a mensagem deve ser gravada sem sair para o provedor.
 *
 * `externalId` e opcional so por compatibilidade com os chamadores que ainda
 * nao resolveram o contato; quando ele existe, sempre passar.
 */
export function entregaLocal(externalId?: string | null): boolean {
  return !isEvolutionConfigured() || ehContatoSimulado(externalId ?? null);
}

/** Identificador da nossa ponta quando nao ha numero real. */
export const REMETENTE_SIMULADO = "local";

let contador = 0;

/**
 * Id unico da mensagem entregue localmente.
 *
 * Precisa ser unico: `messages` tem indice por `(tenantId, messageId)` e e ele
 * que garante a idempotencia do webhook.
 */
export function idSimulado(prefixo: "out" | "in" = "out"): string {
  contador += 1;
  return `local_${prefixo}_${Date.now()}_${contador}`;
}
