/**
 * Ramal descoberto: gente esperando e ninguem para atender.
 *
 * O painel ja sabia CALCULAR isto — a faixa "Operacao agora" mostra o ramal em
 * vermelho — mas so para quem estivesse olhando a tela. De madrugada nao ha
 * ninguem olhando, que e exatamente quando o problema acontece.
 *
 * Esta varredura fecha o laco: quando um ramal fica com fila e sem ninguem
 * disponivel, o sistema avisa. Nao e escalonamento — nao sobe chamado
 * individual por degrau, nem tem prazo por conversa. E a versao coletiva da
 * mesma pergunta, que e a que produz dano real num hospital.
 */
import { db } from "@workspace/db";
import { conversationsTable, departmentsTable } from "@workspace/db";
import { eq, and, sql, isNotNull } from "drizzle-orm";
import { haAtendenteDisponivel } from "./ivr";
import { emitToTenant } from "./socket";
import { logger } from "../lib/logger";

const INTERVALO_MS = 60_000;

/**
 * Ramais que ja foram avisados, por `tenantId:departmentId`.
 *
 * Em memoria, e nao no banco, porque isto e um SINAL AO VIVO e nao um dado com
 * historia: se o processo reiniciar, o pior que acontece e o aviso sair uma vez
 * a mais. Persistir exigiria coluna, migration e limpeza — custo de dado
 * permanente para uma informacao que so vale enquanto a tela esta aberta.
 *
 * Sai do conjunto quando o ramal volta a ter gente, para poder avisar de novo
 * se descobrir outra vez.
 */
const avisados = new Set<string>();

let timer: NodeJS.Timeout | null = null;
let rodando = false;

export async function varrerRamaisDescobertos(): Promise<number> {
  // So os ramais que TEM fila. Ramal ativo e vazio nao interessa: ninguem esta
  // esperando, e avisar sobre ele seria ruido de madrugada em toda central que
  // fecha a noite.
  const comFila = await db
    .select({
      tenantId: conversationsTable.tenantId,
      departmentId: conversationsTable.departmentId,
      nome: departmentsTable.name,
      esperando: sql<number>`COUNT(*)::int`,
    })
    .from(conversationsTable)
    .innerJoin(
      departmentsTable,
      and(
        eq(departmentsTable.id, conversationsTable.departmentId),
        eq(departmentsTable.status, "active"),
      ),
    )
    .where(
      and(
        eq(conversationsTable.status, "waiting"),
        isNotNull(conversationsTable.departmentId),
      ),
    )
    .groupBy(
      conversationsTable.tenantId,
      conversationsTable.departmentId,
      departmentsTable.name,
    );

  const comFilaAgora = new Set<string>();
  let avisos = 0;

  for (const ramal of comFila) {
    if (ramal.departmentId === null) continue;
    const chave = `${ramal.tenantId}:${ramal.departmentId}`;
    comFilaAgora.add(chave);

    if (await haAtendenteDisponivel(ramal.tenantId, ramal.departmentId)) {
      // Voltou a ter gente: esquece, para poder avisar de novo mais tarde.
      avisados.delete(chave);
      continue;
    }

    if (avisados.has(chave)) continue;
    avisados.add(chave);
    avisos++;

    emitToTenant(ramal.tenantId, "ramal_descoberto", {
      departmentId: ramal.departmentId,
      departmentName: ramal.nome,
      esperando: ramal.esperando,
    });

    logger.warn(
      {
        tenantId: ramal.tenantId,
        departmentId: ramal.departmentId,
        esperando: ramal.esperando,
      },
      `Ramal sem atendente disponivel: ${ramal.nome}`,
    );
  }

  // Ramal que esvaziou a fila tambem sai do conjunto. Sem isto, um ramal
  // avisado uma vez nunca mais avisaria — a fila zera de madrugada, enche de
  // novo no dia seguinte, e o segundo dia passa em silencio.
  for (const chave of avisados) {
    if (!comFilaAgora.has(chave)) avisados.delete(chave);
  }

  return avisos;
}

export function iniciarVarreduraDeRamalDescoberto(): void {
  if (timer) return;

  timer = setInterval(() => {
    if (rodando) return;
    rodando = true;
    varrerRamaisDescobertos()
      .catch((err) => {
        // setInterval nao tem para onde propagar rejeicao: sem este catch, uma
        // falha de banco derruba o processo inteiro.
        logger.error({ err }, "Falha na varredura de ramal descoberto");
      })
      .finally(() => {
        rodando = false;
      });
  }, INTERVALO_MS);

  timer.unref();
  logger.info(
    { intervaloMs: INTERVALO_MS },
    "Varredura de ramal descoberto ligada",
  );
}
