/**
 * Entrega local — o que fazer quando nao ha provedor de WhatsApp configurado.
 *
 * Sem Evolution API o produto ficava mudo de um jeito perverso: as falas do
 * robo eram descartadas em silencio (`sendTenantMessage` grava a mensagem so
 * DEPOIS do envio dar certo, e a falha caia num `catch` vazio) e a resposta do
 * atendente devolvia 503. A conversa aparecia pela metade e ninguem conseguia
 * responder — sem log, sem rastro.
 *
 * Aqui a mensagem e gravada e emitida no socket como sempre; o que nao acontece
 * e a chamada ao provedor. Vale so para ambiente sem provedor: com a Evolution
 * configurada, nada disto e acionado e o envio segue normal.
 */
import { isEvolutionConfigured } from "./evolution";

/** true quando nao ha provedor de WhatsApp configurado neste ambiente. */
export function entregaLocal(): boolean {
  return !isEvolutionConfigured();
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
