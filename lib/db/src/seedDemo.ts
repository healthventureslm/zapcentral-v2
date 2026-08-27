/**
 * Popula uma central com os ramais reais do hospital e um historico plausivel.
 *
 * Existe porque tela vazia parece produto quebrado: dashboard zerado, "sem
 * dados no periodo" no relatorio e funil vazio nao demonstram nada. Aqui nascem
 * conversas em todos os estados, com tempo de resposta, tempo de resolucao e
 * nota de satisfacao — o suficiente para os graficos terem forma.
 *
 * Rodar com:
 *   pnpm --filter @workspace/db exec tsx src/seedDemo.ts
 *
 * E idempotente por central: apaga o movimento anterior desta central antes de
 * recriar, para nao empilhar historico a cada ensaio. Nao toca em outras.
 */
import { db, pool } from "./index";
import {
  tenantsTable,
  tenantUsersTable,
  departmentsTable,
  departmentAgentsTable,
  agentStatusesTable,
  channelSettingsTable,
  contactsTable,
  conversationsTable,
  messagesTable,
} from "./schema";
import { eq, and } from "drizzle-orm";

/** Os ramais, no padrao "<unidade> — Medicos" usado pelo hospital. */
const RAMAIS = [
  { nome: "Emergência — Médicos", cor: "#ef4444" },
  { nome: "UTI — Médicos", cor: "#f97316" },
  { nome: "UCI — Médicos", cor: "#eab308" },
  { nome: "USI — Médicos", cor: "#84cc16" },
  { nome: "TMO — Médicos", cor: "#22c55e" },
  { nome: "UI 1 — Médicos", cor: "#14b8a6" },
  { nome: "UI 2 — Médicos", cor: "#06b6d4" },
  { nome: "UI 3 — Médicos", cor: "#3b82f6" },
  { nome: "Centro Cirúrgico — Médicos", cor: "#8b5cf6" },
  { nome: "Radiologia — Médicos", cor: "#ec4899" },
];

/**
 * A equipe. Os ids seguem o formato do bypass de desenvolvimento
 * (`dev_` + base64url de "email|nome"), para estas pessoas conseguirem entrar
 * no painel com a mesma identidade — ver api-server/src/lib/devAuth.ts.
 */
function idDev(email: string, nome: string): string {
  return `dev_${Buffer.from(`${email}|${nome}`, "utf8").toString("base64url")}`;
}

const EQUIPE = [
  { nome: "Marcelo Kalichsztein", email: "marcelo@hospital.local", papel: "admin" as const, ramais: [0, 1] },
  { nome: "Ana Beatriz Rocha", email: "ana.rocha@hospital.local", papel: "agent" as const, ramais: [1, 2] },
  { nome: "Rafael Menezes", email: "rafael.menezes@hospital.local", papel: "agent" as const, ramais: [0, 8] },
  { nome: "Carla Nogueira", email: "carla.nogueira@hospital.local", papel: "supervisor" as const, ramais: [4, 9] },
  { nome: "Diego Ferraz", email: "diego.ferraz@hospital.local", papel: "agent" as const, ramais: [5, 6, 7] },
];

/** Pacientes ficticios. Numeros fora de faixa real, para nao existir de verdade. */
const PACIENTES = [
  ["5521970000101", "Helena Braga"],
  ["5521970000102", "Paulo Vasconcelos"],
  ["5521970000103", "Sônia Meireles"],
  ["5521970000104", "Ricardo Lemos"],
  ["5521970000105", "Juliana Sampaio"],
  ["5521970000106", "Antônio Cordeiro"],
  ["5521970000107", "Beatriz Antunes"],
  ["5521970000108", "Marcos Tavares"],
  ["5521970000109", "Luciana Pires"],
  ["5521970000110", "Eduardo Bastos"],
  ["5521970000111", "Fernanda Klein"],
  ["5521970000112", "Otávio Rezende"],
] as const;

const PERGUNTAS = [
  "Bom dia, o resultado do exame do meu pai já saiu?",
  "Preciso remarcar a consulta de quinta, é possível?",
  "Qual o horário de visita hoje?",
  "O laudo da tomografia já está disponível?",
  "Consigo falar com o médico plantonista?",
  "Preciso da guia de autorização do convênio",
  "A cirurgia foi confirmada para amanhã?",
  "Meu pedido de segunda via do relatório saiu?",
];

const RESPOSTAS = [
  "Bom dia! Já verifiquei aqui, o resultado saiu hoje cedo. Vou te enviar em seguida.",
  "Claro, consigo remarcar sim. Tenho horário na quarta às 14h, serve?",
  "As visitas são das 14h às 16h e das 19h às 20h. Um acompanhante por vez.",
  "Verifiquei com a Radiologia, o laudo fica pronto até o fim da tarde.",
  "O plantonista está em atendimento agora. Assim que liberar eu te aviso.",
];

const AGORA = Date.now();
const HORA = 3_600_000;


/** Data a `h` horas atras. */
function atras(h: number): Date {
  return new Date(AGORA - h * HORA);
}

let seqMensagem = 0;
function idMensagem(): string {
  seqMensagem += 1;
  return `seed_${AGORA}_${seqMensagem}`;
}

async function popular(): Promise<void> {
  const [central] = await db
    .select({ id: tenantsTable.id, name: tenantsTable.name })
    .from(tenantsTable)
    .where(eq(tenantsTable.slug, "central-teste"))
    .limit(1);

  const alvo =
    central ??
    (
      await db
        .select({ id: tenantsTable.id, name: tenantsTable.name })
        .from(tenantsTable)
        .where(eq(tenantsTable.status, "active"))
        .limit(2)
    ).find((t) => t.name !== "System");

  if (!alvo) {
    throw new Error(
      "Nenhuma central encontrada. Rode a configuração inicial no app antes.",
    );
  }

  const tenantId = alvo.id;
  console.log(`Populando a central "${alvo.name}" (id ${tenantId})`);

  // ------------------------------------------------------------------
  // Limpa o movimento anterior desta central. Sem isto, cada ensaio
  // empilharia historico e os relatorios ficariam sem sentido.
  // ------------------------------------------------------------------
  await db.delete(messagesTable).where(eq(messagesTable.tenantId, tenantId));
  await db
    .delete(conversationsTable)
    .where(eq(conversationsTable.tenantId, tenantId));
  await db.delete(contactsTable).where(eq(contactsTable.tenantId, tenantId));

  // ------------------------------------------------------------------
  // Ramais
  // ------------------------------------------------------------------
  const ramais: { id: number; nome: string }[] = [];
  for (const r of RAMAIS) {
    const [existente] = await db
      .select({ id: departmentsTable.id })
      .from(departmentsTable)
      .where(
        and(
          eq(departmentsTable.tenantId, tenantId),
          eq(departmentsTable.name, r.nome),
        ),
      )
      .limit(1);

    if (existente) {
      ramais.push({ id: existente.id, nome: r.nome });
      continue;
    }

    const [novo] = await db
      .insert(departmentsTable)
      .values({
        tenantId,
        name: r.nome,
        description: `Equipe médica — ${r.nome.split(" — ")[0]}`,
        color: r.cor,
        status: "active",
      })
      .returning({ id: departmentsTable.id });
    ramais.push({ id: novo!.id, nome: r.nome });
  }
  console.log(`  ${ramais.length} ramais`);

  // ------------------------------------------------------------------
  // Equipe
  // ------------------------------------------------------------------
  const equipe: { id: string; nome: string; ramais: number[] }[] = [];
  for (const p of EQUIPE) {
    const [primeiro, ...resto] = p.nome.split(" ");
    const id = idDev(p.email, p.nome);

    await db
      .insert(tenantUsersTable)
      .values({
        tenantId,
        clerkUserId: id,
        email: p.email,
        firstName: primeiro ?? null,
        lastName: resto.join(" ") || null,
        role: p.papel,
        status: "active",
      })
      .onConflictDoUpdate({
        target: [tenantUsersTable.tenantId, tenantUsersTable.clerkUserId],
        set: { firstName: primeiro ?? null, lastName: resto.join(" ") || null },
      });

    // Nasce offline: quem decide a disponibilidade e a presenca no painel.
    await db
      .insert(agentStatusesTable)
      .values({ tenantId, clerkUserId: id, status: "offline" })
      .onConflictDoNothing();

    for (const indice of p.ramais) {
      const ramal = ramais[indice];
      if (!ramal) continue;
      await db
        .insert(departmentAgentsTable)
        .values({ tenantId, departmentId: ramal.id, clerkUserId: id })
        .onConflictDoNothing();
    }

    equipe.push({ id, nome: p.nome, ramais: p.ramais });
  }
  console.log(`  ${equipe.length} pessoas na equipe`);

  // ------------------------------------------------------------------
  // Menu do robo — so os quatro primeiros ramais. Um menu com dez opcoes
  // seria ilegivel no WhatsApp, e nao e assim que se usa na pratica.
  // ------------------------------------------------------------------
  const menu = ramais.slice(0, 4).map((r, i) => ({
    key: String(i + 1),
    label: r.nome,
    departmentId: r.id,
  }));

  await db
    .insert(channelSettingsTable)
    .values({
      tenantId,
      welcomeMessage:
        "Olá! Você está falando com a central de ramais do hospital. 👋",
      menuPrompt: "Com qual equipe você precisa falar? Responda com o número:",
      menuOptions: menu,
      distributionMode: "round_robin",
    })
    .onConflictDoUpdate({
      target: [channelSettingsTable.tenantId],
      set: { menuOptions: menu, distributionMode: "round_robin" },
    });
  console.log(`  menu do robô com ${menu.length} opções`);

  // ------------------------------------------------------------------
  // Movimento: conversas em todos os estados, espalhadas nos ultimos 7 dias
  // ------------------------------------------------------------------
  let encerradas = 0;
  let emAtendimento = 0;
  let naFila = 0;

  for (let i = 0; i < PACIENTES.length; i++) {
    const [telefone, nome] = PACIENTES[i]!;

    // As duas ultimas ficam na fila, e de proposito em ramais onde o admin
    // NAO esta: senao o `distribuirFilaParada` as entrega a ele assim que ele
    // abre o painel — o comportamento correto, mas que deixaria a demonstracao
    // sem nenhuma conversa aguardando para mostrar.
    const ficaNaFila = i >= 10;
    const ramal = ficaNaFila
      ? ramais[i === 10 ? 6 : 7]!
      : ramais[i % ramais.length]!;
    const atendente = equipe.find((m) =>
      m.ramais.some((r) => ramais[r]?.id === ramal.id),
    );

    const [contato] = await db
      .insert(contactsTable)
      .values({
        tenantId,
        channel: "whatsapp",
        externalId: telefone,
        phone: telefone,
        name: nome,
        origin: "organic",
        firstContactAt: atras(i * 2 + 4),
        lastContactAt: atras(i * 2),
      })
      .returning({ id: contactsTable.id });

    // 8 encerradas (alimentam os relatorios), 2 em atendimento, 2 na fila
    const encerrada = i < 8;
    const naFilaAgora = ficaNaFila;

    // Concentradas nas ultimas ~26 horas, nao espalhadas por dias: o grafico
    // de volume do painel e recortado por "hoje", e uma amostra esparsa o
    // deixaria vazio — que e como o produto parece quebrado.
    const abertura = atras(i * 2 + 1);
    const primeiraResposta = new Date(
      abertura.getTime() + (2 + (i % 7)) * 60_000,
    );
    const fechamento = new Date(
      abertura.getTime() + (14 + (i % 23)) * 60_000,
    );

    const [conversa] = await db
      .insert(conversationsTable)
      .values({
        tenantId,
        contactId: contato!.id,
        departmentId: ramal.id,
        assignedTo: naFilaAgora ? null : (atendente?.id ?? null),
        status: encerrada ? "closed" : naFilaAgora ? "waiting" : "active",
        lastMessageAt: encerrada ? fechamento : abertura,
        firstResponseAt: naFilaAgora ? null : primeiraResposta,
        ...(encerrada
          ? {
              closedAt: fechamento,
              closedBy: atendente?.id ?? null,
              surveySentAt: fechamento,
              // Notas boas com uma ruim no meio: media alta, mas nao artificial
              rating: i === 5 ? 3 : i % 3 === 0 ? 5 : 4,
              ...(i === 5
                ? { ratingComment: "Demorou um pouco para responder." }
                : {}),
            }
          : {}),
      })
      .returning({ id: conversationsTable.id });

    if (encerrada) encerradas++;
    else if (naFilaAgora) naFila++;
    else emAtendimento++;

    // Mensagens
    const linhas: {
      texto: string;
      entrada: boolean;
      em: Date;
      autor?: string;
    }[] = [
      {
        texto: PERGUNTAS[i % PERGUNTAS.length]!,
        entrada: true,
        em: abertura,
      },
    ];

    if (!naFilaAgora) {
      linhas.push({
        texto: RESPOSTAS[i % RESPOSTAS.length]!,
        entrada: false,
        em: primeiraResposta,
        ...(atendente ? { autor: atendente.id } : {}),
      });
    }

    if (encerrada) {
      linhas.push({
        texto: "Perfeito, muito obrigado pela ajuda!",
        entrada: true,
        em: new Date(fechamento.getTime() - 60_000),
      });
    }

    for (const l of linhas) {
      await db.insert(messagesTable).values({
        conversationId: conversa!.id,
        tenantId,
        messageId: idMensagem(),
        fromPhone: l.entrada ? telefone : "central",
        toPhone: l.entrada ? "central" : telefone,
        type: "text",
        content: l.texto,
        direction: l.entrada ? "inbound" : "outbound",
        status: l.entrada ? "received" : "delivered",
        ...(l.autor ? { sentBy: l.autor } : {}),
        timestamp: l.em,
      });
    }
  }

  // A carga precisa bater com o que existe de fato, senao a fila para de
  // distribuir para quem parece cheio sem estar.
  for (const membro of equipe) {
    const abertas = await db
      .select({ id: conversationsTable.id })
      .from(conversationsTable)
      .where(
        and(
          eq(conversationsTable.tenantId, tenantId),
          eq(conversationsTable.assignedTo, membro.id),
          eq(conversationsTable.status, "active"),
        ),
      );

    await db
      .update(agentStatusesTable)
      .set({ activeConversations: abertas.length, updatedAt: new Date() })
      .where(
        and(
          eq(agentStatusesTable.tenantId, tenantId),
          eq(agentStatusesTable.clerkUserId, membro.id),
        ),
      );
  }

  console.log(
    `  ${encerradas} encerradas · ${emAtendimento} em atendimento · ${naFila} na fila`,
  );
  console.log("\nPronto. Entre no painel com um destes e-mails:");
  for (const p of EQUIPE) console.log(`  ${p.email}  (${p.papel})`);
}

popular()
  .then(() => pool.end())
  .catch((err) => {
    console.error(err);
    return pool.end().then(() => process.exit(1));
  });


