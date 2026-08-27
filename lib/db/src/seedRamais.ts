/**
 * Cria os ramais do hospital numa central de VERDADE.
 *
 *   pnpm --filter @workspace/db run seed:ramais
 *
 * Existe porque o `seedDemo.ts` nao serve para producao: junto com os ramais ele
 * cria equipe ficticia, pacientes inventados, conversas com nota de satisfacao e
 * apaga o movimento anterior da central. Rodar aquilo num banco com atendimento
 * real seria perda de dado.
 *
 * Este aqui faz uma coisa so: garante que os dez ramais existem. Nao cria
 * pessoa, nao cria conversa, nao apaga nada.
 *
 * E idempotente: o que ja existe (pelo nome, dentro da central) e deixado como
 * esta — inclusive a cor, a descricao e o status, que alguem pode ter editado
 * pelo painel. Rodar de novo depois de desativar um ramal NAO o reativa.
 *
 * Qual central: a do `TENANT_SLUG`, ou a unica ativa se houver so uma. Com mais
 * de uma e sem a variavel, ele para e lista as opcoes em vez de escolher sozinho
 * — errar de central aqui e criar dez ramais no hospital errado.
 */
import { db, pool } from "./index";
import { tenantsTable, departmentsTable, channelSettingsTable } from "./schema";
import { eq, and, ne } from "drizzle-orm";
import { RAMAIS } from "./ramais";

async function escolherCentral(): Promise<{ id: number; name: string }> {
  const slug = process.env["TENANT_SLUG"];

  if (slug) {
    const [central] = await db
      .select({ id: tenantsTable.id, name: tenantsTable.name })
      .from(tenantsTable)
      .where(eq(tenantsTable.slug, slug))
      .limit(1);
    if (!central) throw new Error(`Nenhuma central com slug "${slug}".`);
    return central;
  }

  // "System" e a central interna da plataforma, nao um hospital.
  const ativas = await db
    .select({
      id: tenantsTable.id,
      name: tenantsTable.name,
      slug: tenantsTable.slug,
    })
    .from(tenantsTable)
    .where(and(eq(tenantsTable.status, "active"), ne(tenantsTable.name, "System")));

  if (ativas.length === 0) {
    throw new Error(
      "Nenhuma central ativa. Crie a central pelo painel antes de rodar isto.",
    );
  }

  if (ativas.length > 1) {
    const lista = ativas.map((t) => `  ${t.slug}  (${t.name})`).join("\n");
    throw new Error(
      `Ha ${ativas.length} centrais ativas. Diga qual, com TENANT_SLUG=<slug>:\n${lista}`,
    );
  }

  return ativas[0]!;
}

async function criarRamais(): Promise<void> {
  const central = await escolherCentral();
  console.log(`Central: "${central.name}" (id ${central.id})\n`);

  const ids: { id: number; nome: string }[] = [];
  let criados = 0;

  for (const ramal of RAMAIS) {
    const [existente] = await db
      .select({ id: departmentsTable.id })
      .from(departmentsTable)
      .where(
        and(
          eq(departmentsTable.tenantId, central.id),
          eq(departmentsTable.name, ramal.nome),
        ),
      )
      .limit(1);

    if (existente) {
      ids.push({ id: existente.id, nome: ramal.nome });
      console.log(`  ja existia  ${ramal.nome}`);
      continue;
    }

    const [novo] = await db
      .insert(departmentsTable)
      .values({
        tenantId: central.id,
        name: ramal.nome,
        description: `Equipe médica — ${ramal.nome.split(" — ")[0]}`,
        color: ramal.cor,
        status: "active",
      })
      .returning({ id: departmentsTable.id });

    ids.push({ id: novo!.id, nome: ramal.nome });
    criados++;
    console.log(`  criado      ${ramal.nome}`);
  }

  console.log(`\n${criados} criado(s), ${ids.length - criados} ja existia(m).`);

  // O menu do robo so e montado se ainda NAO houver um.
  //
  // Sobrescrever o menu de uma central em operacao mudaria, sem aviso, o numero
  // que os pacientes ja conhecem — quem digitasse "2" cairia noutra equipe. Um
  // menu vazio nao tem esse risco, e sem ele o robo nao tem o que oferecer.
  const [settings] = await db
    .select({
      menuOptions: channelSettingsTable.menuOptions,
    })
    .from(channelSettingsTable)
    .where(eq(channelSettingsTable.tenantId, central.id))
    .limit(1);

  const menuAtual = (settings?.menuOptions ?? []) as unknown[];

  if (menuAtual.length > 0) {
    console.log(
      `\nMenu do robô já configurado com ${menuAtual.length} opção(ões) — não foi tocado.\n` +
        "Para incluir os ramais novos, edite em Configurações do canal.",
    );
    return;
  }

  // Quatro opcoes, e nao dez: um menu com dez linhas fica ilegivel no celular, e
  // nao e assim que se usa na pratica. O resto entra pelo painel, na ordem que o
  // hospital quiser.
  const menu = ids.slice(0, 4).map((r, i) => ({
    key: String(i + 1),
    label: r.nome,
    departmentId: r.id,
  }));

  await db
    .insert(channelSettingsTable)
    .values({ tenantId: central.id, menuOptions: menu })
    .onConflictDoUpdate({
      target: [channelSettingsTable.tenantId],
      set: { menuOptions: menu },
    });

  console.log(`\nMenu do robô montado com ${menu.length} opções:`);
  for (const o of menu) console.log(`  ${o.key} - ${o.label}`);
  console.log("\nOs demais ramais existem e podem entrar no menu pelo painel.");
}

criarRamais()
  .then(() => pool.end())
  .catch((err) => {
    console.error(`\n${err instanceof Error ? err.message : err}`);
    return pool.end().then(() => process.exit(1));
  });
