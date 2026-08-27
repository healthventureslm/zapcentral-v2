/**
 * Varredura de inatividade — encerra sozinho o atendimento que parou.
 *
 * `channel_settings` ja tinha `inactivity_timeout_minutes` e
 * `auto_close_enabled`, a tela de Configuracoes ja deixava editar os dois, e
 * NADA no servidor lia esses campos. Era um botao ligado em coisa nenhuma: a
 * conversa parada ficava aberta para sempre, segurava a vaga do atendente,
 * impedia o contato de abrir outra e nunca entrava no relatorio como
 * abandonada.
 *
 * A varredura roda de minuto em minuto, por central, e usa o mesmo
 * `encerrarConversa` do botao do atendente.
 */
import { db } from "@workspace/db";
import {
  conversationsTable,
  channelSettingsTable,
} from "@workspace/db";
import { eq, and, inArray, sql } from "drizzle-orm";
import { encerrarConversa } from "./encerramento";
import { logger } from "../lib/logger";

const INTERVALO_MS = 60_000;

/**
 * Quantas conversas uma central pode ter encerradas numa passada.
 *
 * Sem teto, a primeira execucao sobre uma base antiga tentaria encerrar tudo o
 * que ficou aberto desde sempre — e cada encerramento manda duas mensagens pelo
 * canal. Seria uma enxurrada de WhatsApp para contatos que ja esqueceram do
 * assunto. Com teto, a base drena ao longo de alguns minutos e da tempo de
 * alguem reparar e desligar, se for o caso.
 */
const TETO_POR_PASSADA = 50;

/** Status em que a conversa ainda esta viva e o relogio corre contra ela. */
const VIVAS = ["new", "ivr", "waiting", "active"] as const;

let timer: NodeJS.Timeout | null = null;
let rodando = false;

export async function varrerInatividade(): Promise<number> {
  // So as centrais que ligaram o encerramento automatico. A configuracao e por
  // central de proposito: uma clinica de agendamento e um pronto-socorro nao
  // tem a mesma nocao de "parado".
  const centrais = await db
    .select({
      tenantId: channelSettingsTable.tenantId,
      minutos: channelSettingsTable.inactivityTimeoutMinutes,
    })
    .from(channelSettingsTable)
    .where(eq(channelSettingsTable.autoCloseEnabled, true));

  let encerradas = 0;

  for (const central of centrais) {
    // Timeout invalido desliga a varredura daquela central em vez de encerrar
    // tudo: `<= 0` faria `now() - interval '0 minutes'` casar com toda conversa
    // viva, inclusive a que acabou de chegar.
    if (!central.minutos || central.minutos <= 0) continue;

    // O filtro comeca por tenantId, que e o inicio do indice
    // `conversations_tenant_status_idx` — e itera por central em vez de varrer a
    // tabela inteira, para o custo nao crescer com o numero de clientes.
    const paradas = await db
      .select({ id: conversationsTable.id })
      .from(conversationsTable)
      .where(
        and(
          eq(conversationsTable.tenantId, central.tenantId),
          inArray(conversationsTable.status, [...VIVAS]),
          sql`${conversationsTable.lastMessageAt} < now() - make_interval(mins => ${central.minutos})`,
        ),
      )
      .limit(TETO_POR_PASSADA);

    for (const conversa of paradas) {
      try {
        const fechada = await encerrarConversa({
          tenantId: central.tenantId,
          conversationId: conversa.id,
          // Ninguem encerrou: foi o relogio. Gravar um atendente aqui poria o
          // nome de alguem num fechamento que ele nao fez, e o relatorio de
          // produtividade contaria isso como atendimento dele.
          encerradaPor: null,
          motivo: "inatividade",
        });
        if (fechada) encerradas++;
      } catch (err) {
        // Uma conversa que falha nao pode levar a passada inteira: as outras da
        // mesma central continuariam abertas por causa dela.
        logger.error(
          { err, tenantId: central.tenantId, conversationId: conversa.id },
          "Falha ao encerrar conversa por inatividade",
        );
      }
    }
  }

  if (encerradas > 0) {
    logger.info({ encerradas }, "Conversas encerradas por inatividade");
  }

  return encerradas;
}

/**
 * Liga a varredura periodica.
 *
 * A trava `rodando` existe porque a passada e assincrona e pode demorar mais
 * que o intervalo — sem ela, duas passadas se sobreporiam e a mesma conversa
 * receberia a despedida duas vezes. `unref()` para o processo nao ficar de pe
 * so por causa do timer.
 */
export function iniciarVarreduraDeInatividade(): void {
  if (timer) return;

  timer = setInterval(() => {
    if (rodando) return;
    rodando = true;
    varrerInatividade()
      .catch((err) => {
        // setInterval nao tem para onde propagar rejeicao: sem este catch, uma
        // falha de banco derruba o processo inteiro.
        logger.error({ err }, "Falha na varredura de inatividade");
      })
      .finally(() => {
        rodando = false;
      });
  }, INTERVALO_MS);

  timer.unref();
  logger.info({ intervaloMs: INTERVALO_MS }, "Varredura de inatividade ligada");
}
