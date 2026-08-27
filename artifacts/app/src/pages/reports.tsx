import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatISO, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Download, 
  Printer, 
  Search,
  Filter,
  Loader2,
  Clock,
  CheckCircle2,
  TrendingUp,
  FileSpreadsheet,
  MessageCircle,
  Star
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import {
  Avatar,
  Button,
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Table,
  Tabs,
} from "@healthventureslm/design-system";
import { useTenantId, useMyRole } from "@/hooks/useTenantId";
import {
  getReportDepartments,
  getReportConversations,
  getReportAgents,
  listAgentStatuses,
  listTags,
  reportConversationsCsvUrl
} from "@/lib/api";

/**
 * O estado da conversa em português.
 *
 * A coluna mostrava o valor cru do banco em caixa alta — "WAITING", "CLOSED".
 * Nenhuma string em inglês pode chegar à tela (ver ENTREGA.md §1), e num
 * relatório que vai para a diretoria do hospital isso é o primeiro detalhe que
 * denuncia software inacabado.
 */
const ESTADO_EM_PORTUGUES: Record<string, string> = {
  new: "Chegou agora",
  ivr: "No robô",
  waiting: "Na fila",
  active: "Em atendimento",
  closed: "Encerrada",
};

export default function ReportsPage() {
  const tenantId = useTenantId();
  const role = useMyRole();
  const [aba, setAba] = useState("atendimento");

  // Todos os endpoints desta tela exigem admin ou supervisor. Sem a guarda,
  // um agente comum dispara 403 em cada uma das consultas ao abrir a pagina.
  const canSeeReports = role === "admin" || role === "supervisor";

  // Filters state
  const [period, setPeriod] = useState("7d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [departmentId, setDepartmentId] = useState<number | "all">("all");
  const [agentId, setAgentId] = useState<string | "all">("all");
  const [tagId, setTagId] = useState<number | "all">("all");

  const filters = useMemo(() => {
    let from, to;
    const today = startOfDay(new Date());

    if (period === "today") from = formatISO(today);
    else if (period === "7d") from = formatISO(subDays(today, 7));
    else if (period === "30d") from = formatISO(subDays(today, 30));
    else if (period === "90d") from = formatISO(subDays(today, 90));
    else if (period === "custom") {
      if (customFrom) from = formatISO(startOfDay(new Date(customFrom)));
      if (customTo) {
        const toDate = startOfDay(new Date(customTo));
        toDate.setDate(toDate.getDate() + 1); // include the whole day
        to = formatISO(toDate);
      }
    }

    return {
      from,
      to,
      departmentId: departmentId !== "all" ? departmentId : undefined,
      agentId: agentId !== "all" ? agentId : undefined,
      tagId: tagId !== "all" ? tagId : undefined,
    };
  }, [period, customFrom, customTo, departmentId, agentId, tagId]);

  // Reference data for filters
  const { data: agents } = useQuery({
    queryKey: ["agents", "status", tenantId],
    queryFn: () => listAgentStatuses(tenantId!),
    enabled: !!tenantId && canSeeReports,
  });

  const { data: tags } = useQuery({
    queryKey: ["tags", tenantId],
    queryFn: () => listTags(tenantId!),
    enabled: !!tenantId && canSeeReports,
  });

  // Main Report Queries
  const { data: departmentsReport, isLoading: loadingDepts, isError: errorDepts } = useQuery({
    queryKey: ["reports", "departments", tenantId, filters],
    queryFn: () => getReportDepartments(tenantId!, filters),
    enabled: !!tenantId && canSeeReports,
  });

  const { data: conversationsReport, isLoading: loadingConvs, isError: errorConvs } = useQuery({
    queryKey: ["reports", "conversations", tenantId, filters],
    queryFn: () => getReportConversations(tenantId!, { ...filters, limit: 100 }), // limit for UI
    enabled: !!tenantId && canSeeReports,
  });

  const { data: agentsReport, isLoading: loadingAgents, isError: errorAgents } = useQuery({
    queryKey: ["reports", "agents", tenantId, filters],
    queryFn: () => getReportAgents(tenantId!, filters),
    enabled: !!tenantId && canSeeReports,
  });

  const formatDuration = (secs: number | null) => {
    if (secs === null) return "-";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
    if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`;
    return `${s}s`;
  };

  const formatCurrency = (val: string | number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(val));
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", { 
      day: "2-digit", month: "2-digit", year: "numeric", 
      hour: "2-digit", minute: "2-digit" 
    });
  };

  const handlePrint = () => {
    window.print();
  };

  if (role !== null && !canSeeReports) {
    return (
      <PageShell title="Relatórios">
        <EmptyState
          title="Acesso restrito"
          description="Os relatórios são restritos a administradores e supervisores."
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Relatórios"
      actions={
        <Button
          variant="primary"
          iconLeft={<Printer className="w-4 h-4" />}
          onClick={handlePrint}
        >
          Exportar PDF
        </Button>
      }
    >
          {/* Filters Bar */}
          <Card className="mb-8 print:hidden">
            <CardBody className="p-4">
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Período</label>
                    <select
                      value={period}
                      onChange={(e) => setPeriod(e.target.value)}
                      className="w-full h-9 rounded-md border border-border px-3 text-sm focus:border-[var(--border-brand)] focus:ring-1 focus:ring-[var(--focus-ring)] outline-none"
                    >
                      <option value="today">Hoje</option>
                      <option value="7d">Últimos 7 dias</option>
                      <option value="30d">Últimos 30 dias</option>
                      <option value="90d">Últimos 90 dias</option>
                      <option value="custom">Personalizado</option>
                    </select>
                  </div>

                  {period === "custom" && (
                    <div className="space-y-1.5 md:col-span-2 flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs font-medium text-muted-foreground">De</label>
                        <input
                          type="date"
                          value={customFrom}
                          onChange={(e) => setCustomFrom(e.target.value)}
                          className="w-full h-9 rounded-md border border-border px-3 text-sm focus:border-[var(--border-brand)] outline-none"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs font-medium text-muted-foreground">Até</label>
                        <input
                          type="date"
                          value={customTo}
                          onChange={(e) => setCustomTo(e.target.value)}
                          className="w-full h-9 rounded-md border border-border px-3 text-sm focus:border-[var(--border-brand)] outline-none"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Ramal</label>
                    <select
                      value={departmentId}
                      onChange={(e) => setDepartmentId(e.target.value === "all" ? "all" : Number(e.target.value))}
                      className="w-full h-9 rounded-md border border-border px-3 text-sm focus:border-[var(--border-brand)] outline-none"
                    >
                      <option value="all">Todos os ramais</option>
                      {departmentsReport?.map(d => (
                        <option key={d.departmentId} value={d.departmentId}>{d.departmentName}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Atendente</label>
                    <select
                      value={agentId}
                      onChange={(e) => setAgentId(e.target.value)}
                      className="w-full h-9 rounded-md border border-border px-3 text-sm focus:border-[var(--border-brand)] outline-none"
                    >
                      <option value="all">Todos os atendentes</option>
                      {agents?.map(a => (
                        <option key={a.clerkUserId} value={a.clerkUserId}>
                          {a.firstName ? `${a.firstName} ${a.lastName || ''}` : a.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Tag (CRM)</label>
                    <select
                      value={tagId}
                      onChange={(e) => setTagId(e.target.value === "all" ? "all" : Number(e.target.value))}
                      className="w-full h-9 rounded-md border border-border px-3 text-sm focus:border-[var(--border-brand)] outline-none"
                    >
                      <option value="all">Todas as tags</option>
                      {tags?.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* O Tabs do design system e so a barra: nao renderiza painel.
              A aba visivel fica em estado, e cada painel e condicional. */}
          <div className="print:hidden mb-6">
            <Tabs
              value={aba}
              onChange={setAba}
              items={[
                { value: "atendimento", label: "Atendimento" },
                { value: "agentes", label: "Atendentes" },
              ]}
            />
          </div>

            {/* TAB: ATENDIMENTO */}
          {aba === "atendimento" && (
            <div className="space-y-6">
              <Card>
                <CardHeader title="Desempenho por ramal" />
                <CardBody>
                  {errorDepts ? (
                    <EmptyState
                      size="sm"
                      title="Não foi possível carregar o relatório"
                      description="Tente novamente."
                    />
                  ) : loadingDepts ? (
                    <EmptyState size="sm" loading />
                  ) : (
                    <Table
                      sortable
                      rowKey="departmentId"
                      emptyText="Sem dados no período."
                      data={departmentsReport ?? []}
                      columns={[
                        {
                          key: "departmentName",
                          header: "Ramal",
                          render: (d) => (
                            <span className="inline-flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: d.departmentColor || "var(--border-strong)" }}
                              />
                              <span className="font-medium">{d.departmentName}</span>
                            </span>
                          ),
                        },
                        { key: "total", header: "Total", align: "right", mono: true },
                        { key: "closed", header: "Resolvidos", align: "right", mono: true },
                        {
                          key: "resolutionRate",
                          header: "Taxa resolução",
                          align: "right",
                          mono: true,
                          render: (d) =>
                            d.resolutionRate !== null ? `${d.resolutionRate}%` : "—",
                        },
                        {
                          key: "avgFirstResponseSecs",
                          header: "T.M. 1ª resposta",
                          align: "right",
                          mono: true,
                          render: (d) => formatDuration(d.avgFirstResponseSecs),
                        },
                        {
                          key: "avgResolutionSecs",
                          header: "T.M. resolução",
                          align: "right",
                          mono: true,
                          render: (d) => formatDuration(d.avgResolutionSecs),
                        },
                      ]}
                    />
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader
                  title="Últimas conversas no período"
                  action={
                    <a
                      href={tenantId ? reportConversationsCsvUrl(tenantId, filters) : "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="hv-link inline-flex items-center gap-1.5 text-xs font-medium print:hidden"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      Exportar CSV
                    </a>
                  }
                />
                <CardBody>
                  {errorConvs ? (
                    <EmptyState
                      size="sm"
                      title="Não foi possível carregar o relatório"
                      description="Tente novamente."
                    />
                  ) : loadingConvs ? (
                    <EmptyState size="sm" loading />
                  ) : (
                    <Table
                      sortable
                      rowKey="id"
                      data={conversationsReport ?? []}
                      emptyText="Sem conversas no período selecionado."
                      columns={[
                        {
                          key: "contactName",
                          header: "Contato",
                          render: (c) => (
                            <>
                              <div className="font-medium">
                                {c.contactName || c.contactPhone}
                              </div>
                              {c.contactName && (
                                <div className="text-xs text-[var(--text-muted)] font-mono">
                                  {c.contactPhone}
                                </div>
                              )}
                            </>
                          ),
                        },
                        {
                          key: "status",
                          header: "Status",
                          render: (c) => (
                            <Badge variant="neutral">
                              {ESTADO_EM_PORTUGUES[c.status] ?? c.status}
                            </Badge>
                          ),
                        },
                        {
                          key: "departmentName",
                          header: "Ramal",
                          render: (c) => c.departmentName || "—",
                        },
                        {
                          key: "assignedTo",
                          header: "Atendente",
                          render: (c) =>
                            c.assignedTo
                              ? agents?.find((a) => a.clerkUserId === c.assignedTo)
                                  ?.firstName || "Atribuído"
                              : "—",
                        },
                        {
                          key: "createdAt",
                          header: "Início",
                          render: (c) => formatDate(c.createdAt),
                        },
                        {
                          key: "firstResponseSecs",
                          header: "1ª resposta",
                          align: "right",
                          mono: true,
                          render: (c) => formatDuration(c.firstResponseSecs),
                        },
                        {
                          key: "resolutionSecs",
                          header: "Resolução",
                          align: "right",
                          mono: true,
                          render: (c) => formatDuration(c.resolutionSecs),
                        },
                      ]}
                    />
                  )}
                </CardBody>
              </Card>
            </div>
          )}

            {/* TAB: AGENTES */}
          {aba === "agentes" && (
            <div>
              <Card>
                <CardHeader title="Ranking de produtividade" />
                <CardBody>
                  {errorAgents ? (
                    <EmptyState
                      size="sm"
                      title="Não foi possível carregar o relatório"
                      description="Tente novamente."
                    />
                  ) : loadingAgents ? (
                    <EmptyState size="sm" loading />
                  ) : (
                    <Table
                      sortable
                      rowKey="agentId"
                      emptyText="Nenhum dado de agente no período."
                      /* Copia antes de ordenar: `.sort()` altera o array no
                         lugar, e este vem do cache do react-query — ordenar
                         aqui reordenava o dado guardado. */
                      data={[...(agentsReport ?? [])].sort((a, b) => b.closed - a.closed)}
                      columns={[
                        {
                          key: "agentId",
                          header: "Atendente",
                          sortable: false,
                          render: (row) => {
                            const info = agents?.find((a) => a.clerkUserId === row.agentId);
                            const nome = info?.firstName
                              ? `${info.firstName} ${info.lastName ?? ""}`.trim()
                              : "Atendente desconhecido";
                            return (
                              <span className="inline-flex items-center gap-3">
                                <Avatar
                                  size="sm"
                                  src={info?.avatarUrl ?? undefined}
                                  fromName={nome}
                                />
                                <span className="font-medium">{nome}</span>
                              </span>
                            );
                          },
                        },
                        { key: "handled", header: "Atendidas", align: "right", mono: true },
                        { key: "closed", header: "Resolvidas", align: "right", mono: true },
                        {
                          key: "avgFirstResponseSecs",
                          header: "T.M. 1ª resposta",
                          align: "right",
                          mono: true,
                          render: (row) => formatDuration(row.avgFirstResponseSecs),
                        },
                        {
                          key: "avgResolutionSecs",
                          header: "T.M. resolução",
                          align: "right",
                          mono: true,
                          render: (row) => formatDuration(row.avgResolutionSecs),
                        },
                        {
                          key: "avgRating",
                          header: "Satisfação",
                          align: "right",
                          mono: true,
                          render: (row) =>
                            row.avgRating != null ? (
                              <span className="inline-flex items-center justify-end gap-1">
                                <Star className="w-3.5 h-3.5 text-[var(--amber-400,#F0A500)] fill-current" />
                                {row.avgRating.toFixed(1)}
                                <span className="text-[var(--text-muted)]">
                                  ({row.ratingCount})
                                </span>
                              </span>
                            ) : (
                              "—"
                            ),
                        },
                      ]}
                    />
                  )}
                </CardBody>
              </Card>
            </div>
          )}

    </PageShell>
  );
}