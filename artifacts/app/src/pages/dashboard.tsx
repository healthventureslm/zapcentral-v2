import { useQuery } from "@tanstack/react-query";
import { UserButton, useUser } from "@/lib/devAuth";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  MessageCircle,
  Users,
  BarChart3,
  Settings,
  Clock,
  CheckCircle2,
  Smartphone,
  Send,
  PhoneCall,
  Loader2,
  Headset,
  ListTree,
  PlayCircle,
} from "lucide-react";
import { useInternalChatNotifications } from "@/hooks/useInternalChat";
import {
  Badge,
  PageHeader,
  Spinner,
  StatCard,
  LineChart,
  EmptyState,
  Avatar,
  Card,
  CardBody,
  CardHeader,
  Table,
} from "@healthventureslm/design-system";
import { useTenantId, useMyRole } from "@/hooks/useTenantId";
import { useRamalDescoberto } from "@/hooks/useRamalDescoberto";
import { cn } from "@/lib/utils";
import {
  getReportOverview,
  getReportVolume,
  listConversations,
  listAgentStatuses,
  listDepartments,
  type AgentStatus,
  type DepartmentRow,
  type Conversation,
} from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const navItems = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Atendimento", path: "/atendimento", icon: MessageCircle },
  { name: "Equipe", path: "/equipe", icon: Headset },
  { name: "WhatsApp", path: "/whatsapp", icon: Smartphone },
  { name: "Telegram", path: "/telegram", icon: Send },
  { name: "Atendimento automático", path: "/configuracoes-canal", icon: ListTree },
  { name: "Simulador", path: "/simulador", icon: PlayCircle },
  { name: "Contatos", path: "/crm", icon: Users },
  { name: "Relatórios", path: "/relatorios", icon: BarChart3 },
  { name: "Configurações", path: "/settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();
  const tenantId = useTenantId();
  const internalUnread = useInternalChatNotifications(tenantId);
  const { user } = useUser();

  return (
    <div className="fixed inset-y-0 left-0 w-64 bg-[#0F1923] flex flex-col z-10 sidebar-transition print:hidden">
      <div className="h-16 flex items-center px-6 border-b border-white/5">
        <MessageCircle className="w-6 h-6 text-primary mr-2" />
        <span className="text-white font-semibold text-lg tracking-wide">
          ZapCentral
        </span>
      </div>

      <div className="flex-1 py-6 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location === item.path || location.startsWith(item.path + "/");
          const isExact = location === item.path;
          const active = isActive && (item.path !== "/" || isExact);
          const Icon = item.icon;

          return (
            <Link key={item.path} href={item.path}>
              <div
                className={`flex items-center px-3 py-2.5 rounded-md cursor-pointer transition-colors ${
                  active
                    ? "bg-primary/10 text-primary border-r-2 border-primary"
                    : "text-muted-foreground hover:text-white hover:bg-card/5"
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                <span className="font-medium text-sm">{item.name}</span>
                {item.path === "/equipe" && internalUnread > 0 && (
                  <span className="ml-auto bg-primary text-white text-[10px] font-semibold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                    {internalUnread > 99 ? "99+" : internalUnread}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-white/5 flex items-center gap-3">
        <UserButton />
        {/* O nome de quem esta logado, e nao "Minha Conta": numa demonstracao
            com duas telas lado a lado, saber quem e cada janela e o que faz a
            transferencia entre atendentes ficar legivel. */}
        <span className="text-sm text-muted-foreground font-medium truncate">
          {user?.fullName ?? "Minha conta"}
        </span>
      </div>
    </div>
  );
}


/**
 * "1 conversa" / "3 conversas".
 *
 * O "(s)" resolve o problema gramatical e cria outro: numa frase que existe para
 * ser lida rapido, ele obriga o leitor a escolher a forma certa no meio da
 * leitura.
 */
function plural(n: number, singular: string, plural_: string): string {
  return `${n} ${n === 1 ? singular : plural_}`;
}

/**
 * Traduz segundos em algo que se le em voz alta.
 *
 * "3,2 min" e "192 s" sao o mesmo dado, mas so o primeiro cabe numa frase dita
 * para um gestor.
 */
function duracaoHumana(segundos: number | null | undefined): string {
  if (segundos === null || segundos === undefined) return "—";
  if (segundos < 60) return `${Math.round(segundos)} s`;
  const min = segundos / 60;
  if (min < 60) return `${min.toFixed(1).replace(".", ",")} min`;
  return `${(min / 60).toFixed(1).replace(".", ",")} h`;
}

type Julgamento = "bom" | "atencao" | "ruim" | "neutro";

/** O acento do StatCard e semantico: o design system escolhe a cor. */
const ACENTO_DO_JULGAMENTO: Record<
  Julgamento,
  "petrol" | "emerald" | "amber" | "coral" | "crimson"
> = {
  bom: "emerald",
  atencao: "amber",
  ruim: "crimson",
  neutro: "petrol",
};

/**
 * Indicador com veredito.
 *
 * O numero sozinho obriga quem le a saber de cabeca qual e a meta. Um painel que
 * diz "3,2 min" e um painel que diz "3,2 min — acima da meta de 3 min" custam o
 * mesmo e sao produtos diferentes: o segundo pode ser lido por quem nunca abriu
 * o sistema antes.
 */
function IndicadorComVeredito({
  titulo,
  valor,
  unidade,
  veredito,
  julgamento,
  explicacao,
}: {
  titulo: string;
  valor: string;
  unidade?: string;
  veredito: string;
  julgamento: Julgamento;
  explicacao: string;
}) {
  return (
    <StatCard
      label={titulo}
      value={unidade ? `${valor} ${unidade}` : valor}
      hint={explicacao}
      trend={{ value: veredito, positive: julgamento === "bom" }}
      accent={ACENTO_DO_JULGAMENTO[julgamento]}
    />
  );
}

/**
 * Operacao agora — quem esta atendendo, ramal por ramal.
 *
 * O painel ja dizia quantas pessoas estavam online, num numero so. Um numero so
 * nao responde a pergunta que o gestor faz de verdade, que e por ramal: dez
 * atendentes online nao ajudam se os dois da Emergencia foram almocar.
 *
 * O ramal com fila e sem ninguem disponivel aparece primeiro e em vermelho. E o
 * unico estado aqui que exige acao imediata de alguem.
 */
function OperacaoAgora({
  ramais,
  equipe,
  naFila,
  carregando,
}: {
  ramais: DepartmentRow[];
  equipe: AgentStatus[];
  naFila: Conversation[];
  carregando: boolean;
}) {
  const nomeDe = (a: AgentStatus) =>
    [a.firstName, a.lastName].filter(Boolean).join(" ") || a.email;

  const linhas = ramais
    .filter((r) => r.status === "active")
    .map((ramal) => {
      const doRamal = equipe.filter((a) => a.departmentIds.includes(ramal.id));
      return {
        ramal,
        // "Disponivel" e o mesmo criterio que a distribuicao automatica usa:
        // presente E com vaga. Contar quem esta no teto mostraria equipe de
        // sobra num ramal que, para a fila, esta fechado.
        disponiveis: doRamal.filter(
          (a) => a.status === "available" && a.activeConversations < a.maxConversations,
        ),
        online: doRamal.filter((a) => a.status !== "offline"),
        fila: naFila.filter((c) => c.departmentId === ramal.id).length,
      };
    })
    .sort((a, b) => {
      const critico = (l: typeof a) => (l.fila > 0 && l.disponiveis.length === 0 ? 0 : 1);
      return critico(a) - critico(b) || b.fila - a.fila || a.ramal.name.localeCompare(b.ramal.name);
    });

  const descobertos = linhas.filter((l) => l.fila > 0 && l.disponiveis.length === 0).length;

  return (
    <Card className="mt-6">
      <CardHeader
        title="Operação agora"
        action={
          !carregando ? (
            <Badge variant={descobertos > 0 ? "danger" : "positive"}>
              {descobertos > 0
                ? `${descobertos} ${plural(descobertos, "ramal com fila e sem ninguém disponível", "ramais com fila e sem ninguém disponível")}`
                : "Todo ramal com fila tem alguém para atender"}
            </Badge>
          ) : undefined
        }
      />
      <CardBody>
        {carregando ? (
          <EmptyState size="sm" loading />
        ) : (
          /* Tabela, e nao divs empilhadas: a coluna da direita nao se explicava
             sozinha. Com cabecalho, "Disponiveis" diz o que aquele texto e — e
             no celular o proprio componente vira lista de cards, em vez de
             espremer nome de agente contra nome de ramal. */
          <Table
            sortable
            rowKey="id"
            emptyText="Nenhum ramal ativo."
            data={linhas.map(({ ramal, disponiveis, online, fila }) => ({
              id: ramal.id,
              ramal,
              fila,
              disponiveis,
              online,
              descoberto: fila > 0 && disponiveis.length === 0,
            }))}
            columns={[
              {
                key: "ramal",
                header: "Ramal",
                sortAccessor: (l) => l.ramal.name,
                render: (l) => (
                  <span className="inline-flex items-center gap-2.5">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: l.ramal.color }}
                    />
                    <span className="font-medium">{l.ramal.name}</span>
                  </span>
                ),
              },
              {
                key: "fila",
                header: "Fila",
                align: "right",
                mono: true,
                render: (l) =>
                  l.fila > 0 ? (
                    <Badge variant={l.descoberto ? "danger" : "warning"}>
                      {l.fila}
                    </Badge>
                  ) : (
                    <span className="text-[var(--text-subtle)]">—</span>
                  ),
              },
              {
                key: "disponiveis",
                header: "Disponíveis",
                align: "right",
                sortAccessor: (l) => l.disponiveis.length,
                render: (l) =>
                  l.disponiveis.length > 0 ? (
                    <span className="text-xs text-[var(--text-muted)]">
                      {l.disponiveis.map(nomeDe).join(", ")}
                    </span>
                  ) : l.descoberto ? (
                    <Badge variant="danger">Ninguém disponível</Badge>
                  ) : (
                    <span className="text-xs text-[var(--text-muted)]">
                      {l.online.length > 0 ? "Sem vaga livre" : "Ninguém online"}
                    </span>
                  ),
              },
            ]}
          />
        )}
      </CardBody>
    </Card>
  );
}

export default function DashboardPage() {
  const tenantId = useTenantId();
  const role = useMyRole();

  // Os relatorios exigem admin ou supervisor no servidor. Sem esta guarda o
  // agente comum dispara 403 a cada intervalo de polling, indefinidamente.
  const canSeeReports = role === "admin" || role === "supervisor";
  const roleResolved = role !== null;

  // Avisa quem manda quando um ramal fica com fila e sem ninguem disponivel.
  useRamalDescoberto(tenantId, role);

  const { data: overview, isLoading: loadingOverview, error: overviewErr } = useQuery({
    queryKey: ["reports", "overview", tenantId],
    queryFn: () => getReportOverview(tenantId!),
    enabled: !!tenantId && canSeeReports,
    refetchInterval: 10000,
    retry: (count, err) =>
      (err as { status?: number }).status !== 403 && count < 2,
  });
  // Agente comum nao tem acesso a analytics (so admin/supervisor)
  const noReportAccess =
    (roleResolved && !canSeeReports) ||
    (overviewErr as { status?: number } | null)?.status === 403;

  const { data: volume, isError: volumeError } = useQuery({
    queryKey: ["reports", "volume", tenantId, "hour", "today"],
    queryFn: () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      return getReportVolume(tenantId!, {
        granularity: "hour",
        from: startOfDay.toISOString(),
        to: new Date().toISOString(),
      });
    },
    enabled: !!tenantId && canSeeReports,
    refetchInterval: 30000,
  });

  const { data: agents } = useQuery({
    queryKey: ["agents", "status", tenantId],
    queryFn: () => listAgentStatuses(tenantId!),
    enabled: !!tenantId,
    refetchInterval: 10000,
  });

  const { data: waitingRes } = useQuery({
    queryKey: ["conversations", "waiting", tenantId],
    queryFn: () => listConversations(tenantId!, { status: "waiting", limit: 20 }),
    enabled: !!tenantId,
    refetchInterval: 10000,
  });

  const { data: ramais } = useQuery({
    queryKey: ["departments", tenantId],
    queryFn: () => listDepartments(tenantId!),
    enabled: !!tenantId,
    refetchInterval: 30000,
  });

  const onlineAgents =
    agents?.filter((a) => a.status !== "offline").length ?? 0;

  const waitingConversations = [...(waitingRes?.conversations || [])]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(0, 5);

  // -------------------------------------------------------------------------
  // Os vereditos.
  //
  // A regra de corte mora aqui, e nao no servidor, de proposito: e julgamento de
  // apresentacao, nao dado. O servidor entrega o numero e a meta; a tela decide
  // como chamar o resultado.
  // -------------------------------------------------------------------------
  const metaEmSegundos = overview?.period.slaTargetSecs ?? 180;
  const metaEmMinutos = Math.round(metaEmSegundos / 60);

  const tempoMedio = overview?.period.avgFirstResponseSecs ?? null;
  const vereditoTempo: { texto: string; julgamento: Julgamento } =
    tempoMedio === null
      ? { texto: "sem atendimento no período", julgamento: "neutro" }
      : tempoMedio <= metaEmSegundos
        ? { texto: `dentro da meta de ${metaEmMinutos} min`, julgamento: "bom" }
        : tempoMedio <= metaEmSegundos * 2
          ? { texto: `acima da meta de ${metaEmMinutos} min`, julgamento: "atencao" }
          : { texto: `mais do que o dobro da meta`, julgamento: "ruim" };

  const pctNaMeta = overview?.period.slaPct ?? null;
  const vereditoMeta: { texto: string; julgamento: Julgamento } =
    pctNaMeta === null
      ? { texto: "ninguém foi atendido no período", julgamento: "neutro" }
      : pctNaMeta >= 90
        ? { texto: "muito bom", julgamento: "bom" }
        : pctNaMeta >= 70
          ? { texto: "aceitável, dá para melhorar", julgamento: "atencao" }
          : { texto: "abaixo do aceitável", julgamento: "ruim" };

  const nota = overview?.period.avgRating ?? null;
  const quantosAvaliaram = overview?.period.ratingCount ?? 0;
  const vereditoNota: { texto: string; julgamento: Julgamento } =
    nota === null || quantosAvaliaram === 0
      ? { texto: "ninguém avaliou ainda", julgamento: "neutro" }
      : nota >= 4.5
        ? { texto: `ótima — ${plural(quantosAvaliaram, "avaliação", "avaliações")}`, julgamento: "bom" }
        : nota >= 3.5
          ? { texto: `boa — ${plural(quantosAvaliaram, "avaliação", "avaliações")}`, julgamento: "atencao" }
          : { texto: `baixa — ${plural(quantosAvaliaram, "avaliação", "avaliações")}`, julgamento: "ruim" };

  // A frase de resumo. Montada em pedaços porque "0 pessoas esperando" e
  // "ninguém esperando" nao sao a mesma leitura para quem le com pressa.
  const emAtendimento = overview?.live.active ?? 0;
  const naFila = overview?.live.waiting ?? 0;
  const noRobo = overview?.live.inIvr ?? 0;
  const resolvidasHoje = overview?.live.closedToday ?? 0;

  const resumoAgora = [
    emAtendimento === 0
      ? "Agora: nenhuma conversa em atendimento"
      : `Agora: ${plural(emAtendimento, "conversa em atendimento", "conversas em atendimento")}`,
    naFila === 0
      ? " e ninguém esperando na fila"
      : ` e ${plural(naFila, "pessoa esperando na fila", "pessoas esperando na fila")}`,
    noRobo > 0
      ? `, ${plural(noRobo, "ainda escolhendo o ramal no robô", "ainda escolhendo o ramal no robô")}`
      : "",
    resolvidasHoje === 0
      ? ". Hoje nenhum atendimento foi encerrado"
      : `. Hoje ${plural(resolvidasHoje, "atendimento foi encerrado", "atendimentos foram encerrados")}`,
    tempoMedio !== null
      ? `, com ${duracaoHumana(tempoMedio)} de espera média pela primeira resposta nos últimos 30 dias.`
      : ".",
  ].join("");

  const formatBucketTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <Sidebar />

      <div className="ml-64 flex flex-col print:ml-0">
        <div className="px-8 pt-6 print:hidden">
          <PageHeader
            title="Painel principal"
            actions={<Badge variant="neutral">Central {tenantId ?? "…"}</Badge>}
          />
        </div>

        <main className="flex-1 p-8">
          {noReportAccess && (
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              As métricas do painel estão disponíveis apenas para administradores e
              supervisores. Acesse o Atendimento para ver suas conversas.
            </div>
          )}
          {/* A leitura do painel em uma frase.
              Sem isto, quem abre a tela precisa somar cinco numeros de cabeca
              para saber se a central esta bem ou mal AGORA. */}
          {!noReportAccess && overview && (
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed max-w-3xl">
              {resumoAgora}
            </p>
          )}

          {/* Os cinco indicadores do agora. Dirigidos por dados em vez de cinco
              blocos repetidos: o acento e semantico (o design system escolhe a
              cor), nao um circulo pastel escrito na mao. */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            {(
              [
                { rotulo: "Ativas", icone: <MessageCircle className="w-5 h-5" />, valor: overview?.live.active, acento: "petrol" },
                { rotulo: "Aguardando", icone: <Clock className="w-5 h-5" />, valor: overview?.live.waiting, acento: "amber" },
                { rotulo: "No robô (IVR)", icone: <PhoneCall className="w-5 h-5" />, valor: overview?.live.inIvr, acento: "petrol" },
                { rotulo: "Agentes online", icone: <Users className="w-5 h-5" />, valor: agents ? onlineAgents : undefined, acento: "emerald" },
                { rotulo: "Resolvidos hoje", icone: <CheckCircle2 className="w-5 h-5" />, valor: overview?.live.closedToday, acento: "emerald" },
              ] as const
            ).map((c) => (
              <StatCard
                key={c.rotulo}
                icon={c.icone}
                label={c.rotulo}
                accent={c.acento}
                value={
                  c.valor === undefined ? (
                    <Spinner size="sm" />
                  ) : (
                    c.valor
                  )
                }
              />
            ))}
          </div>

          {!noReportAccess && (
            <div className="mb-8">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-sm font-semibold text-foreground">
                  Como a central atendeu nos últimos 30 dias
                </h2>
                <Link
                  href="/relatorios"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Ver o relatório completo
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <IndicadorComVeredito
                  titulo="Tempo até a primeira resposta"
                  valor={duracaoHumana(overview?.period.avgFirstResponseSecs)}
                  veredito={vereditoTempo.texto}
                  julgamento={vereditoTempo.julgamento}
                  explicacao={`Do momento em que o paciente escreve até alguém da equipe responder. A meta é ${metaEmMinutos} min.`}
                />
                <IndicadorComVeredito
                  titulo="Atendidos dentro da meta"
                  valor={
                    overview?.period.slaPct === null ||
                    overview?.period.slaPct === undefined
                      ? "—"
                      : String(overview.period.slaPct)
                  }
                  unidade={
                    overview?.period.slaPct === null ||
                    overview?.period.slaPct === undefined
                      ? undefined
                      : "%"
                  }
                  veredito={vereditoMeta.texto}
                  julgamento={vereditoMeta.julgamento}
                  explicacao={`Quantos, entre os que foram atendidos, receberam resposta em menos de ${metaEmMinutos} min.`}
                />
                <IndicadorComVeredito
                  titulo="Satisfação (1 a 5)"
                  valor={
                    overview?.period.avgRating
                      ? overview.period.avgRating
                          .toFixed(1)
                          .replace(".", ",")
                      : "—"
                  }
                  veredito={vereditoNota.texto}
                  julgamento={vereditoNota.julgamento}
                  explicacao="Nota que os próprios pacientes deram no fim do atendimento."
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader title={<>Volume de Conversas (Hoje)</>} />
              <CardBody>
                {/* Altura minima, nao fixa. A legenda do LineChart renderiza
                    ABAIXO da area do grafico: um contentor de 300px com um
                    grafico de 300px deixa a legenda para fora. O minimo mantem
                    o cartao estavel nos estados de carregando e sem dados, sem
                    limitar o que o grafico precisa. */}
                <div className="min-h-[300px] w-full">
                  {volumeError ? (
                    <EmptyState
                      size="sm"
                      title="Não foi possível carregar o gráfico"
                      description="Tentando novamente…"
                    />
                  ) : !volume ? (
                    <EmptyState size="sm" loading loadingLabel="Carregando o volume…" />
                  ) : volume.length === 0 ? (
                    <EmptyState size="sm" title="Sem dados para o período." />
                  ) : (
                    /* As cores vem do design system. Antes eram hex fixos de
                       tema claro (#25D366 nas linhas, #E5E7EB na grade,
                       #6B7280 nos rotulos) — no tema escuro o grafico
                       simplesmente sumia. */
                    <LineChart
                      height={300}
                      area
                      showGrid
                      legend
                      labels={volume.map((v) => formatBucketTime(v.bucket))}
                      series={[
                        { name: "Total", data: volume.map((v) => v.total) },
                        { name: "Resolvidas", data: volume.map((v) => v.closed) },
                      ]}
                    />
                  )}
                </div>
              </CardBody>
            </Card>

            <Card className="flex flex-col">
              <CardHeader title="Maior tempo de espera" />
              <CardBody className="flex-1 overflow-auto">
                {!waitingRes ? (
                  <EmptyState size="sm" loading />
                ) : waitingConversations.length === 0 ? (
                  <EmptyState
                    size="sm"
                    icon={<CheckCircle2 className="w-8 h-8" />}
                    title="Nenhuma conversa aguardando."
                  />
                ) : (
                  <div className="space-y-4">
                    {waitingConversations.map((conv) => (
                      <Link key={conv.id} href={`/atendimento?c=${conv.id}`} className="block">
                        <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-green-200 hover:bg-green-50/50 transition-colors cursor-pointer mb-3 last:mb-0 group">
                          <div className="flex items-center gap-3">
                            <Avatar
                              size="md"
                              src={conv.contact.avatarUrl ?? undefined}
                              fromName={conv.contact.name ?? undefined}
                            />
                            <div>
                              <p className="text-sm font-medium text-foreground group-hover:text-green-700 transition-colors">
                                {conv.contact.name || conv.contact.phone}
                              </p>
                              {conv.departmentName && (
                                <Badge variant="neutral" className="mt-1">
                                  {conv.departmentName}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-medium text-amber-600 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDistanceToNow(new Date(conv.createdAt), { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          <OperacaoAgora
            ramais={ramais ?? []}
            equipe={agents ?? []}
            naFila={waitingRes?.conversations ?? []}
            carregando={!ramais || !agents}
          />
        </main>
      </div>
    </div>
  );
}