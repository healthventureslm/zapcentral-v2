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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTenantId, useMyRole } from "@/hooks/useTenantId";
import {
  getReportOverview,
  getReportVolume,
  listConversations,
  listAgentStatuses,
} from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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
        <MessageCircle className="w-6 h-6 text-[#25D366] mr-2" />
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
                    ? "bg-[#25D366]/10 text-[#25D366] border-r-2 border-[#25D366]"
                    : "text-[#8899A6] hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                <span className="font-medium text-sm">{item.name}</span>
                {item.path === "/equipe" && internalUnread > 0 && (
                  <span className="ml-auto bg-[#25D366] text-white text-[10px] font-semibold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
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
        <span className="text-sm text-[#8899A6] font-medium truncate">
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

const CORES_DO_JULGAMENTO: Record<Julgamento, string> = {
  bom: "text-emerald-600",
  atencao: "text-amber-600",
  ruim: "text-red-600",
  neutro: "text-gray-400",
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
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {titulo}
        </p>
        <div className="flex items-baseline gap-1 mt-2">
          <span className="text-3xl font-bold text-gray-900">{valor}</span>
          {unidade && (
            <span className="text-sm font-medium text-gray-500">{unidade}</span>
          )}
        </div>
        <p
          className={`text-xs font-semibold mt-1 ${CORES_DO_JULGAMENTO[julgamento]}`}
        >
          {veredito}
        </p>
        <p className="text-[11px] text-gray-400 mt-2 leading-snug">
          {explicacao}
        </p>
      </CardContent>
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
    <div className="min-h-[100dvh] bg-[#F4F7F8]">
      <Sidebar />

      <div className="ml-64 flex flex-col print:ml-0">
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-8 z-0 print:hidden">
          <h1 className="text-xl font-semibold text-gray-800">
            Painel Principal
          </h1>
          <Badge variant="outline" className="text-xs font-medium bg-gray-50">
            Tenant: {tenantId || "..."}
          </Badge>
        </header>

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
            <p className="text-sm text-gray-600 mb-6 leading-relaxed max-w-3xl">
              {resumoAgora}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <Card>
              <CardContent className="p-6 flex items-center">
                <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Ativas
                  </p>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {loadingOverview ? <Loader2 className="w-5 h-5 animate-spin mt-1" /> : overview?.live.active ?? 0}
                  </h3>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 flex items-center">
                <div className="p-3 rounded-full bg-amber-100 text-amber-600 mr-4">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Aguardando
                  </p>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {loadingOverview ? <Loader2 className="w-5 h-5 animate-spin mt-1" /> : overview?.live.waiting ?? 0}
                  </h3>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 flex items-center">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
                  <PhoneCall className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    No Robô (IVR)
                  </p>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {loadingOverview ? <Loader2 className="w-5 h-5 animate-spin mt-1" /> : overview?.live.inIvr ?? 0}
                  </h3>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 flex items-center">
                <div className="p-3 rounded-full bg-indigo-100 text-indigo-600 mr-4">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Agentes Online
                  </p>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {agents ? onlineAgents : <Loader2 className="w-5 h-5 animate-spin mt-1" />}
                  </h3>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 flex items-center">
                <div className="p-3 rounded-full bg-purple-100 text-purple-600 mr-4">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Resolvidos Hoje
                  </p>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {loadingOverview ? <Loader2 className="w-5 h-5 animate-spin mt-1" /> : overview?.live.closedToday ?? 0}
                  </h3>
                </div>
              </CardContent>
            </Card>
          </div>

          {!noReportAccess && (
            <div className="mb-8">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-700">
                  Como a central atendeu nos últimos 30 dias
                </h2>
                <Link
                  href="/relatorios"
                  className="text-xs font-medium text-[#25D366] hover:underline"
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
              <CardHeader>
                <CardTitle className="text-base text-gray-800">Volume de Conversas (Hoje)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  {volumeError ? (
                    <div className="w-full h-full flex items-center justify-center text-red-500 text-sm">
                      Erro ao carregar o gráfico. Tentando novamente...
                    </div>
                  ) : !volume ? (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <Loader2 className="w-8 h-8 animate-spin" />
                    </div>
                  ) : volume.length === 0 ? (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
                      Sem dados para o período.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={volume} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#25D366" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#25D366" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorClosed" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis 
                          dataKey="bucket" 
                          tickFormatter={formatBucketTime} 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 12, fill: '#6B7280' }} 
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 12, fill: '#6B7280' }} 
                        />
                        <Tooltip 
                          labelFormatter={(label) => formatBucketTime(label as string)}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="total" 
                          name="Total" 
                          stroke="#25D366" 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorTotal)" 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="closed" 
                          name="Resolvidas" 
                          stroke="#6366F1" 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorClosed)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-gray-800">Maior Tempo de Espera</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto">
                {!waitingRes ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : waitingConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 py-8">
                    <CheckCircle2 className="w-10 h-10 text-green-400 mb-2" />
                    <p className="text-sm font-medium">Nenhuma conversa aguardando.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {waitingConversations.map((conv) => (
                      <Link key={conv.id} href={`/atendimento?c=${conv.id}`} className="block">
                        <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-green-200 hover:bg-green-50/50 transition-colors cursor-pointer mb-3 last:mb-0 group">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border border-gray-100">
                              <AvatarImage src={conv.contact.avatarUrl || undefined} />
                              <AvatarFallback className="bg-gray-50 text-gray-600 text-xs font-medium">
                                {conv.contact.name ? conv.contact.name.substring(0, 2).toUpperCase() : "??"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium text-gray-900 group-hover:text-green-700 transition-colors">
                                {conv.contact.name || conv.contact.phone}
                              </p>
                              {conv.departmentName && (
                                <Badge variant="secondary" className="mt-1 text-[10px] px-1.5 py-0 h-4 border-none bg-gray-100 text-gray-600">
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
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}