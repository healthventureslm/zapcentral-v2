/**
 * Chat page — main agent interface.
 * Left panel: conversation list. Right panel: message thread + input.
 */
import {
  Avatar,
  Badge,
  Button,
  IconButton,
  StatusDot,
  Tabs,
  Textarea,
} from "@healthventureslm/design-system";
import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/devAuth";
import { initSocket, getSocket, joinTenant } from "@/lib/socket";
import { avisarChamadoNovo, limparAvisos } from "@/lib/aviso";
import { Send, Phone, X, ArrowRightLeft, Loader2, Wifi, WifiOff, ChevronDown, MessageCircle, PanelRightOpen, PanelRightClose } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { ContactPanel } from "@/components/ContactPanel";
import {
  listConversations,
  listMessages,
  sendMessage,
  pickConversation,
  closeConversation,
  transferConversation,
  listDepartments,
  listTenantUsers,
  updateMyStatus,
  getMyStatus,
  type Conversation,
  type Message,
  contactHandle,
} from "@/lib/api";
import { useTenantId } from "@/hooks/useTenantId";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatCpf } from "@/lib/cpf";

const STATUS_LABELS: Record<string, string> = {
  new: "Novo",
  ivr: "URA",
  waiting: "Na Fila",
  active: "Ativo",
  closed: "Fechado",
};

type Variante = "neutral" | "positive" | "warning" | "danger" | "info" | "brand";

const STATUS_VARIANTS: Record<string, Variante> = {
  new: "info",
  ivr: "brand",
  waiting: "warning",
  active: "positive",
  closed: "neutral",
};

/** O ponto ao lado do proprio status do agente. */
const AGENT_STATUS_DOT: Record<string, "positive" | "warning" | "neutral"> = {
  available: "positive",
  busy: "warning",
  away: "warning",
  offline: "neutral",
};

const AGENT_STATUS_LABELS: Record<string, string> = {
  available: "Disponível",
  busy: "Ocupado",
  away: "Ausente",
  offline: "Offline",
};

function formatTime(ts: string | null): string {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return "Agora";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function ConversationItem({
  conv,
  active,
  naoVista,
  onClick,
}: {
  conv: Conversation;
  active: boolean;
  /** Chegou algo aqui e ninguem abriu ainda. */
  naoVista: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-card/5 transition-colors border-b border-white/5",
        active && "bg-primary/10",
        // A barra na lateral marca a linha sem mexer no layout: pintar o fundo
        // brigaria com o destaque da conversa aberta, e as duas coisas podem
        // valer ao mesmo tempo.
        naoVista && !active && "bg-primary/[0.06] border-l-2 border-l-primary",
      )}
    >
      {/*
        O Avatar do design system descarta filhos: as iniciais saem de
        `fromName`, e o gradiente de fundo tambem — mesmo nome, mesma cor,
        sempre. Passar as iniciais prontas dava "?" em todo mundo.
      */}
      <Avatar
        size="md"
        className="shrink-0 mt-0.5"
        src={conv.contact.avatarUrl ?? undefined}
        fromName={conv.contact.name ?? contactHandle(conv.contact)}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-[var(--text-strong)] text-sm truncate">
            {conv.contact.name ?? contactHandle(conv.contact)}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">
            {formatTime(conv.lastMessageAt)}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant={STATUS_VARIANTS[conv.status] ?? "neutral"}>
            {STATUS_LABELS[conv.status]}
          </Badge>
          {/* O canal aparece nos DOIS casos, e nao so no Telegram.
              A fila e a mesma para WhatsApp e Telegram — e esse e o ponto do
              produto. Marcar so um dos dois deixava a lista parecendo
              exclusivamente de WhatsApp com um intruso, em vez de um balcao
              unico atendendo dois canais. */}
          <Badge outline variant={conv.contact.channel === "telegram" ? "info" : "positive"}>
            {conv.contact.channel === "telegram" ? "Telegram" : "WhatsApp"}
          </Badge>
          {conv.departmentName && (
            <span className="text-xs text-muted-foreground truncate">
              {conv.departmentName}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function MessageBubble({
  msg,
  autor,
}: {
  msg: Message;
  autor?: string | undefined;
}) {
  const isOut = msg.direction === "outbound";
  return (
    <div className={cn("flex mb-3", isOut ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[70%] rounded-xl px-4 py-2.5 shadow-sm",
          isOut
            ? "bg-primary text-white rounded-br-sm"
            : "bg-card text-foreground rounded-bl-sm",
        )}
      >
        {/* Quem respondeu. No WhatsApp do paciente esta informacao vai como
            prefixo no texto (la nao ha interface para isso); aqui ela e um
            rotulo. Os dois lados mostram a mesma coisa. */}
        {isOut && autor && (
          <p className="text-[11px] font-semibold text-white/80 mb-0.5">
            {autor}
          </p>
        )}
        {msg.type === "image" && msg.mediaUrl && (
          <img
            src={msg.mediaUrl}
            alt={msg.mediaCaption ?? "imagem"}
            className="rounded-lg mb-1 max-w-full"
          />
        )}
        {msg.type === "audio" && (
          <div className="flex items-center gap-2 text-sm opacity-80 py-1">
            <span>🎵</span>
            <span>Mensagem de áudio</span>
          </div>
        )}
        {msg.type === "document" && (
          <div className="flex items-center gap-2 text-sm opacity-80 py-1">
            <span>📄</span>
            <span>{msg.content ?? "Documento"}</span>
          </div>
        )}
        {msg.type === "video" && (
          <div className="flex items-center gap-2 text-sm opacity-80 py-1">
            <span>🎥</span>
            <span>Vídeo{msg.mediaCaption ? `: ${msg.mediaCaption}` : ""}</span>
          </div>
        )}
        {msg.content && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
        )}
        {msg.mediaCaption && msg.type === "image" && (
          <p className="text-xs mt-1 opacity-80">{msg.mediaCaption}</p>
        )}
        <span
          className={cn(
            "text-[10px] mt-1 block text-right opacity-60",
          )}
        >
          {new Date(msg.timestamp).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
          {isOut && msg.status === "read" && " ✓✓"}
          {isOut && msg.status === "delivered" && " ✓✓"}
          {isOut && msg.status === "sent" && " ✓"}
        </span>
      </div>
    </div>
  );
}

type FilterTab = "all" | "mine" | "queue";

export default function ChatPage() {
  const tenantId = useTenantId();
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  /** Conversas com novidade que a pessoa ainda nao abriu. */
  const [naoVistas, setNaoVistas] = useState<Set<number>>(new Set());

  // O handler do socket e registrado uma vez so. Ler `selectedId` direto de la
  // congelaria o valor do primeiro render, e toda conversa aberta continuaria
  // bipando. A ref e o que mantem o handler estavel e o valor atual.
  const selectedIdRef = useRef<number | null>(null);
  useEffect(() => {
    selectedIdRef.current = selectedId;
    if (selectedId === null) return;
    setNaoVistas((s) => {
      if (!s.has(selectedId)) return s;
      const proximo = new Set(s);
      proximo.delete(selectedId);
      return proximo;
    });
  }, [selectedId]);

  // Voltar para a aba zera o contador do titulo: a pessoa ja viu.
  useEffect(() => {
    const aoVoltar = () => {
      if (document.visibilityState === "visible") limparAvisos();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("focus", aoVoltar);
    return () => {
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("focus", aoVoltar);
    };
  }, []);
  const [inputText, setInputText] = useState("");
  const [agentStatus, setAgentStatus] = useState<"available" | "busy" | "away" | "offline">("offline");
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showContactPanel, setShowContactPanel] = useState(true);

  // Load agent status
  const { data: myStatus } = useQuery({
    queryKey: ["agent-status-me", tenantId],
    queryFn: () => (tenantId ? getMyStatus(tenantId) : null),
    enabled: !!tenantId,
  });

  useEffect(() => {
    if (myStatus?.status) setAgentStatus(myStatus.status);
  }, [myStatus]);

  // Load conversations
  const statusFilter =
    activeTab === "queue" ? "waiting" : activeTab === "mine" ? "active" : undefined;

  const { data: convData, isLoading: convsLoading } = useQuery({
    queryKey: ["conversations", tenantId, statusFilter],
    queryFn: () => (tenantId ? listConversations(tenantId, { status: statusFilter }) : null),
    enabled: !!tenantId,
    refetchInterval: 10_000,
  });

  const conversations = convData?.conversations ?? [];

  // Load messages for selected conversation
  const { data: messages, isLoading: msgsLoading } = useQuery({
    queryKey: ["messages", tenantId, selectedId],
    queryFn: () =>
      tenantId && selectedId ? listMessages(tenantId, selectedId) : [],
    enabled: !!tenantId && !!selectedId,
    refetchInterval: 5_000,
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Socket.io — authenticated with Clerk session token
  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;

    getToken().then((token) => {
      if (cancelled) return;
      const socket = initSocket(token);

      socket.on("connect", () => setIsConnected(true));
      socket.on("disconnect", () => setIsConnected(false));

      // Server verifies tenant membership on join_tenant; join_agent uses server-derived userId
      joinTenant(socket, tenantId);

      socket.on("new_message", (data: { conversationId: number }) => {
        void qc.invalidateQueries({ queryKey: ["messages", tenantId, data.conversationId] });
        void qc.invalidateQueries({ queryKey: ["conversations", tenantId] });

        // Só avisa o que a pessoa não está vendo. A conversa aberta na tela
        // atualiza sozinha, e bipar a cada mensagem dela — inclusive as que o
        // próprio atendente acabou de mandar — treinaria todo mundo a ignorar
        // o aviso, que é o oposto do que ele existe para fazer.
        if (data.conversationId !== selectedIdRef.current) {
          setNaoVistas((s) => new Set(s).add(data.conversationId));
          avisarChamadoNovo();
        }
      });
      socket.on("conversation_updated", () => {
        void qc.invalidateQueries({ queryKey: ["conversations", tenantId] });
      });
      socket.on("conversation_assigned", (data: { conversation: { id: number } }) => {
        void qc.invalidateQueries({ queryKey: ["conversations", tenantId] });
        setNaoVistas((s) => new Set(s).add(data.conversation.id));
        avisarChamadoNovo();
        toast({ title: "Nova conversa atribuída", description: `Conversa #${data.conversation.id}` });
      });

      setIsConnected(socket.connected);
    });

    return () => {
      cancelled = true;
      const socket = getSocket();
      if (socket) {
        socket.off("connect");
        socket.off("disconnect");
        socket.off("new_message");
        socket.off("conversation_updated");
        socket.off("conversation_assigned");
      }
    };
  }, [tenantId, getToken, qc, toast]);

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: () =>
      sendMessage(tenantId!, selectedId!, { type: "text", content: inputText }),
    onSuccess: (msg) => {
      setInputText("");
      qc.setQueryData(
        ["messages", tenantId, selectedId],
        (old: Message[] = []) => [...old, msg],
      );
    },
    onError: () => {
      toast({ title: "Erro ao enviar mensagem", variant: "destructive" });
    },
  });

  // Pick conversation mutation
  const pickMutation = useMutation({
    mutationFn: (convId: number) => pickConversation(tenantId!, convId),
    onSuccess: (conv) => {
      void qc.invalidateQueries({ queryKey: ["conversations", tenantId] });
      setSelectedId(conv.id);
      setActiveTab("mine");
    },
    onError: () => toast({ title: "Erro ao pegar conversa", variant: "destructive" }),
  });

  // Close conversation
  // Transferir entre ramais. O backend ja avisa o paciente da troca; aqui e so
  // escolher o destino.
  const { data: equipe = [] } = useQuery({
    queryKey: ["tenant-users", tenantId],
    queryFn: () => listTenantUsers(tenantId!),
    enabled: !!tenantId,
  });

  const { data: setores = [] } = useQuery({
    queryKey: ["departments", tenantId],
    queryFn: () => listDepartments(tenantId!),
    enabled: !!tenantId,
  });

  const transferMutation = useMutation({
    mutationFn: (toDepartmentId: number) =>
      transferConversation(tenantId!, selectedId!, { toDepartmentId }),
    onSuccess: () => {
      setTransferindo(false);
      void qc.invalidateQueries({ queryKey: ["conversations", tenantId] });
      toast({ title: "Conversa transferida" });
    },
    onError: () =>
      toast({
        title: "Não foi possível transferir",
        description:
          "Confira se você é o responsável pela conversa e se o ramal está ativo.",
        variant: "destructive",
      }),
  });

  const closeMutation = useMutation({
    mutationFn: () => closeConversation(tenantId!, selectedId!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["conversations", tenantId] });
      setSelectedId(null);
      toast({ title: "Conversa encerrada" });
    },
    onError: () => toast({ title: "Erro ao fechar conversa", variant: "destructive" }),
  });

  // Update agent status
  const statusMutation = useMutation({
    mutationFn: (status: typeof agentStatus) =>
      updateMyStatus(tenantId!, { status }),
    onSuccess: (data) => setAgentStatus(data.status),
  });

  const [transferindo, setTransferindo] = useState(false);
  const selectedConv = conversations.find((c) => c.id === selectedId);

  /** Nome de quem respondeu, para o rotulo na bolha. */
  const nomeDoAutor = (clerkUserId: string | null | undefined) => {
    if (!clerkUserId) return undefined;
    const membro = equipe.find((m) => m.clerkUserId === clerkUserId);
    const nome = [membro?.firstName, membro?.lastName].filter(Boolean).join(" ");
    return nome || undefined;
  };

  // Sem isto o menu de ramais fica flutuando sobre a conversa depois de um
  // clique em qualquer outro lugar, e reabre sozinho ao trocar de conversa —
  // ao vivo, parece defeito.
  useEffect(() => setTransferindo(false), [selectedId]);
  useEffect(() => {
    if (!transferindo) return;
    const fechar = () => setTransferindo(false);
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, [transferindo]);

  const handleSend = useCallback(() => {
    if (!inputText.trim() || !selectedId || !tenantId) return;
    sendMutation.mutate();
  }, [inputText, selectedId, tenantId, sendMutation]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="sala-escura flex h-[100dvh] bg-background">
      <Sidebar />

      {/* Conversation list */}
      <div className="ml-64 flex flex-col w-80 shrink-0 border-r border-white/5 h-full">
        {/*
          A tela se nomeia, como as outras onze.
          O PageShell nao serve aqui — o painel ocupa a altura toda e nao cabe
          um cabecalho de pagina — mas o icone e o nome vindos do menu sao o
          que faz a tela e o item da barra lerem como o mesmo lugar. Sem isso
          Atendimento era a unica que nao dizia onde voce estava.
        */}
        <div className="h-14 flex items-center gap-2 px-4 border-b border-white/5 bg-[var(--surface-sunken)]">
          <MessageCircle className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm font-semibold text-[var(--text-strong)]">
            Atendimento
          </span>
        </div>

        {/* Situacao do agente */}
        <div className="h-11 flex items-center justify-between px-4 border-b border-white/5">
          <div className="relative">
            <button
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              className="flex items-center gap-2 text-sm text-foreground hover:text-[var(--text-strong)]"
            >
              <StatusDot status={AGENT_STATUS_DOT[agentStatus] ?? "neutral"} />
              {AGENT_STATUS_LABELS[agentStatus]}
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>
            {showStatusMenu && (
              <div className="absolute top-8 left-0 bg-[var(--surface-raised)] border border-white/10 rounded-lg shadow-xl z-50 py-1 w-40">
                {(["available", "busy", "away", "offline"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      statusMutation.mutate(s);
                      setShowStatusMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-strong)] hover:bg-card/5"
                  >
                    <StatusDot status={AGENT_STATUS_DOT[s] ?? "neutral"} />
                    {AGENT_STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            )}
          </div>
          {isConnected ? (
            <Wifi className="w-3.5 h-3.5 text-primary" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-red-400" />
          )}
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onChange={(v) => setActiveTab(v as FilterTab)}
          items={[
            { value: "all", label: "Todos" },
            { value: "mine", label: "Minhas" },
            { value: "queue", label: "Fila" },
          ]}
        />

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {convsLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm gap-2">
              <MessageCircle className="w-6 h-6" />
              <span>Nenhuma conversa</span>
            </div>
          ) : (
            conversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                active={conv.id === selectedId}
                naoVista={naoVistas.has(conv.id)}
                onClick={() => setSelectedId(conv.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Chat panel */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {!selectedConv ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <MessageCircle className="w-12 h-12 opacity-30" />
            <span className="text-sm">Selecione uma conversa</span>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="h-14 bg-[var(--surface-sunken)] border-b border-white/5 flex items-center justify-between px-6">
              <div className="flex items-center gap-3">
                <Avatar
                  size="sm"
                  src={selectedConv.contact.avatarUrl ?? undefined}
                  fromName={selectedConv.contact.name ?? contactHandle(selectedConv.contact)}
                />
                <div>
                  <p className="text-sm font-semibold text-[var(--text-strong)]">
                    {selectedConv.contact.name ?? contactHandle(selectedConv.contact)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedConv.contact.phone}
                    {selectedConv.contact.cpf && ` · CPF: ${formatCpf(selectedConv.contact.cpf)}`}
                    {selectedConv.departmentName && ` · ${selectedConv.departmentName}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant={STATUS_VARIANTS[selectedConv.status] ?? "neutral"}>
                  {STATUS_LABELS[selectedConv.status]}
                </Badge>

                <IconButton
                  size="sm"
                  label={showContactPanel ? "Ocultar dados do contato" : "Mostrar dados do contato"}
                  onClick={() => setShowContactPanel((v) => !v)}
                >
                  {showContactPanel ? (
                    <PanelRightClose className="w-4 h-4" />
                  ) : (
                    <PanelRightOpen className="w-4 h-4" />
                  )}
                </IconButton>

                {selectedConv.status === "waiting" && (
                  <Button
                    size="sm"
                    iconLeft={<Phone className="w-3.5 h-3.5" />}
                    loading={pickMutation.isPending}
                    onClick={() => pickMutation.mutate(selectedConv.id)}
                  >
                    Pegar
                  </Button>
                )}

                {["active", "waiting"].includes(selectedConv.status) && (
                  <div
                    className="relative"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="quiet"
                      size="sm"
                      iconLeft={<ArrowRightLeft className="w-3.5 h-3.5" />}
                      onClick={() => setTransferindo((v) => !v)}
                    >
                      Transferir
                    </Button>

                    {transferindo && (
                      <div className="absolute right-0 top-full mt-1 w-56 bg-[var(--surface-raised)] border border-white/10 rounded-lg shadow-xl z-20 py-1">
                        <p className="px-3 py-1.5 text-[11px] text-muted-foreground uppercase tracking-wide">
                          Transferir para o ramal
                        </p>
                        {setores.filter(
                          (d) =>
                            d.id !== selectedConv.departmentId &&
                            d.status === "active",
                        ).length === 0 && (
                          <p className="px-3 py-2 text-xs text-muted-foreground">
                            Não há outro ramal cadastrado.
                          </p>
                        )}
                        {setores
                          .filter(
                            (d) =>
                              d.id !== selectedConv.departmentId &&
                              d.status === "active",
                          )
                          .map((d) => (
                            <button
                              key={d.id}
                              onClick={() => transferMutation.mutate(d.id)}
                              disabled={transferMutation.isPending}
                              className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-card/5 transition-colors"
                            >
                              {d.name}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {["active", "waiting"].includes(selectedConv.status) && (
                  <Button
                    variant="danger"
                    size="sm"
                    iconLeft={<X className="w-3.5 h-3.5" />}
                    loading={closeMutation.isPending}
                    onClick={() => closeMutation.mutate()}
                  >
                    Fechar
                  </Button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 bg-[var(--surface-conversa)]">
              {msgsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                </div>
              ) : (messages ?? []).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2">
                  <MessageCircle className="w-6 h-6 opacity-40" />
                  <span>Nenhuma mensagem ainda</span>
                </div>
              ) : (
                (messages ?? []).map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    autor={nomeDoAutor(msg.sentBy)}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            {selectedConv.status === "active" && (
              <div className="bg-[var(--surface-sunken)] border-t border-white/5 px-4 py-3 flex items-end gap-3">
                <Textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite uma mensagem... (Enter para enviar)"
                  rows={1}
                  className="flex-1 max-h-32"
                />
                <IconButton
                  variant="solid"
                  label="Enviar mensagem"
                  disabled={!inputText.trim() || sendMutation.isPending}
                  onClick={handleSend}
                >
                  {sendMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </IconButton>
              </div>
            )}

            {selectedConv.status !== "active" && (
              <div className="bg-[var(--surface-sunken)] border-t border-white/5 px-6 py-3 text-xs text-muted-foreground text-center">
                {selectedConv.status === "waiting"
                  ? "Pegue a conversa para começar a atender"
                  : selectedConv.status === "closed"
                  ? "Conversa encerrada"
                  : "Aguardando o cliente passar pelo IVR"}
              </div>
            )}
          </>
        )}
      </div>

      {/* Contact context panel */}
      {selectedConv && showContactPanel && tenantId && (
        <ContactPanel
          tenantId={tenantId}
          contactId={selectedConv.contactId}
          conversationId={selectedConv.id}
        />
      )}
    </div>
  );
}
