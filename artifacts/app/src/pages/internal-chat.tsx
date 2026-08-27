/**
 * Internal chat page — 1:1 conversations between agents (ramal-to-ramal).
 * Left: colleagues with presence + my conversations. Right: message thread.
 */
import { Avatar, Badge, IconButton, Textarea } from "@healthventureslm/design-system";
import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser, useAuth } from "@/lib/devAuth";
import { Send, Loader2, MessageCircle, Headset } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { initSocket, getSocket, joinTenant } from "@/lib/socket";
import {
  listAgentStatuses,
  listInternalConversations,
  startInternalConversation,
  listInternalMessages,
  sendInternalMessage,
  type InternalMessage,
} from "@/lib/api";
import { useTenantId } from "@/hooks/useTenantId";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const PRESENCE_COLORS: Record<string, string> = {
  available: "bg-green-500",
  busy: "bg-amber-500",
  away: "bg-yellow-400",
  offline: "bg-gray-400",
};

const PRESENCE_LABELS: Record<string, string> = {
  available: "Disponível",
  busy: "Ocupado",
  away: "Ausente",
  offline: "Offline",
};

function nameOf(p: { firstName: string | null; lastName: string | null; email: string }) {
  return p.firstName ? `${p.firstName} ${p.lastName ?? ""}`.trim() : p.email;
}

function initialsOf(p: { firstName: string | null; lastName: string | null; email: string }) {
  return nameOf(p).slice(0, 2).toUpperCase();
}

export default function InternalChatPage() {
  const tenantId = useTenantId();
  const { user } = useUser();
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const endRef = useRef<HTMLDivElement>(null);

  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [inputText, setInputText] = useState("");

  const { data: colleagues } = useQuery({
    queryKey: ["agent-statuses", tenantId],
    queryFn: () => listAgentStatuses(tenantId!),
    enabled: !!tenantId,
    refetchInterval: 30_000,
  });

  const { data: convs, isLoading: convsLoading } = useQuery({
    queryKey: ["internal-conversations", tenantId],
    queryFn: () => listInternalConversations(tenantId!),
    enabled: !!tenantId,
  });

  const { data: messages, isLoading: msgsLoading } = useQuery({
    queryKey: ["internal-messages", tenantId, selectedConvId],
    queryFn: () => listInternalMessages(tenantId!, selectedConvId!),
    enabled: !!tenantId && !!selectedConvId,
  });

  // Opening a thread marks it read server-side; refresh unread counters
  useEffect(() => {
    if (selectedConvId && messages) {
      void qc.invalidateQueries({ queryKey: ["internal-conversations", tenantId] });
    }
  }, [selectedConvId, messages, qc, tenantId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Real-time: refresh open thread when a message arrives
  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;

    const handler = (data: { conversationId: number; tenantId: number }) => {
      if (data.tenantId !== tenantId) return;
      void qc.invalidateQueries({
        queryKey: ["internal-messages", tenantId, data.conversationId],
      });
      void qc.invalidateQueries({ queryKey: ["internal-conversations", tenantId] });
    };

    void getToken().then((token) => {
      if (cancelled) return;
      const socket = initSocket(token);
      joinTenant(socket, tenantId);
      socket.on("internal_message", handler);
    });

    return () => {
      cancelled = true;
      getSocket()?.off("internal_message", handler);
    };
  }, [tenantId, getToken, qc]);

  const startMutation = useMutation({
    mutationFn: (peerId: string) => startInternalConversation(tenantId!, peerId),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ["internal-conversations", tenantId] });
      setSelectedConvId(data.id);
    },
    onError: (e: Error) =>
      toast({ title: "Erro ao abrir conversa", description: e.message, variant: "destructive" }),
  });

  const sendMutation = useMutation({
    mutationFn: () => sendInternalMessage(tenantId!, selectedConvId!, inputText.trim()),
    onSuccess: (msg) => {
      setInputText("");
      qc.setQueryData(
        ["internal-messages", tenantId, selectedConvId],
        (old: InternalMessage[] = []) => [...old, msg],
      );
      void qc.invalidateQueries({ queryKey: ["internal-conversations", tenantId] });
    },
    onError: () => toast({ title: "Erro ao enviar mensagem", variant: "destructive" }),
  });

  const handleSend = useCallback(() => {
    if (!inputText.trim() || !selectedConvId || !tenantId || sendMutation.isPending) return;
    sendMutation.mutate();
  }, [inputText, selectedConvId, tenantId, sendMutation]);

  const selectedConv = convs?.find((c) => c.id === selectedConvId);
  const presenceOf = (userId: string) =>
    colleagues?.find((c) => c.clerkUserId === userId)?.status ?? "offline";

  const myId = user?.id;
  const others = (colleagues ?? []).filter((c) => c.clerkUserId !== myId);
  const convPeerIds = new Set((convs ?? []).map((c) => c.peer.clerkUserId));

  return (
    <div className="sala-escura flex h-[100dvh] bg-background">
      <Sidebar />

      {/* Left panel */}
      <div className="ml-64 flex flex-col w-80 shrink-0 border-r border-white/5 h-full">
        <div className="h-14 flex items-center gap-2 px-4 border-b border-white/5 bg-[var(--surface-sunken)]">
          <Headset className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-[var(--text-strong)]">Chat interno</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Existing conversations */}
          {convsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
          ) : (
            (convs ?? []).map((c) => {
              const presence = presenceOf(c.peer.clerkUserId);
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedConvId(c.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-card/5 transition-colors border-b border-white/5",
                    c.id === selectedConvId && "bg-primary/10",
                  )}
                >
                  <div className="relative shrink-0">
                    <Avatar size="md" src={c.peer.avatarUrl ?? undefined}>
                      {initialsOf(c.peer)}
                    </Avatar>
                    <span
                      className={cn(
                        "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[var(--surface-canvas)]",
                        PRESENCE_COLORS[presence],
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-strong)] truncate">{nameOf(c.peer)}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.lastMessage
                        ? (c.lastMessage.senderId === myId ? "Você: " : "") + c.lastMessage.content
                        : "Sem mensagens"}
                    </p>
                  </div>
                  {c.unreadCount > 0 && (
                    <Badge variant="brand">
                      {c.unreadCount}
                    </Badge>
                  )}
                </button>
              );
            })
          )}

          {/* Colleagues without a conversation yet */}
          {others.filter((c) => !convPeerIds.has(c.clerkUserId)).length > 0 && (
            <>
              <p className="px-4 pt-4 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Colegas
              </p>
              {others
                .filter((c) => !convPeerIds.has(c.clerkUserId))
                .map((c) => (
                  <button
                    key={c.clerkUserId}
                    onClick={() => startMutation.mutate(c.clerkUserId)}
                    disabled={startMutation.isPending}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-card/5 transition-colors"
                  >
                    <div className="relative shrink-0">
                      <Avatar size="sm" src={c.avatarUrl ?? undefined}>
                        {initialsOf(c)}
                      </Avatar>
                      <span
                        className={cn(
                          "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[var(--surface-canvas)]",
                          PRESENCE_COLORS[c.status] ?? PRESENCE_COLORS["offline"],
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--text-strong)] truncate">{nameOf(c)}</p>
                      <p className="text-xs text-muted-foreground">
                        {PRESENCE_LABELS[c.status] ?? "Offline"}
                      </p>
                    </div>
                  </button>
                ))}
            </>
          )}

          {!convsLoading && !others.length && !(convs ?? []).length && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm gap-2">
              <MessageCircle className="w-6 h-6" />
              <span>Nenhum colega nesta central ainda</span>
            </div>
          )}
        </div>
      </div>

      {/* Thread */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {!selectedConv ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <Headset className="w-12 h-12 opacity-30" />
            <span className="text-sm">Selecione um colega para conversar</span>
          </div>
        ) : (
          <>
            <div className="h-14 bg-[var(--surface-sunken)] border-b border-white/5 flex items-center gap-3 px-6">
              <div className="relative">
                <Avatar size="sm" src={selectedConv.peer.avatarUrl ?? undefined}>
                  {initialsOf(selectedConv.peer)}
                </Avatar>
                <span
                  className={cn(
                    "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[var(--surface-sunken)]",
                    PRESENCE_COLORS[presenceOf(selectedConv.peer.clerkUserId)],
                  )}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-strong)]">{nameOf(selectedConv.peer)}</p>
                <p className="text-xs text-muted-foreground">
                  {PRESENCE_LABELS[presenceOf(selectedConv.peer.clerkUserId)]}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 bg-[var(--surface-canvas)]">
              {msgsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                </div>
              ) : (
                (messages ?? []).map((m) => {
                  const mine = m.senderId === myId;
                  return (
                    <div key={m.id} className={cn("flex mb-3", mine ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[70%] rounded-xl px-4 py-2.5 shadow-sm",
                          mine
                            ? "bg-primary text-white rounded-br-sm"
                            : "bg-card text-foreground rounded-bl-sm",
                        )}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                        <span className="text-[10px] mt-1 block text-right opacity-60">
                          {new Date(m.createdAt).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={endRef} />
            </div>

            <div className="p-4 bg-[var(--surface-sunken)] border-t border-white/5">
              <div className="flex items-end gap-3">
                <Textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  rows={1}
                  placeholder="Mensagem interna (não vai para o WhatsApp)"
                  className="flex-1"
                />
                <IconButton
                  variant="solid"
                  label="Enviar mensagem interna"
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
            </div>
          </>
        )}
      </div>
    </div>
  );
}
