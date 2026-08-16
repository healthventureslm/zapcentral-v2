/**
 * Global internal-chat notifications: unread badge + toast + beep.
 * Mounted once in the Sidebar so it runs on every page.
 */
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { useLocation } from "wouter";
import { initSocket, getSocket } from "@/lib/socket";
import { listInternalConversations, type InternalMessage } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

/** Short notification beep via WebAudio (no asset needed). */
function playBeep(): void {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
    osc.onended = () => void ctx.close();
  } catch {
    // Audio may be blocked before user interaction — ignore
  }
}

export function useInternalChatNotifications(tenantId: number | null): number {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { getToken } = useAuth();
  const [location] = useLocation();

  const { data: convs } = useQuery({
    queryKey: ["internal-conversations", tenantId],
    queryFn: () => listInternalConversations(tenantId!),
    enabled: !!tenantId,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;

    const handler = (data: {
      conversationId: number;
      tenantId: number;
      message: InternalMessage;
      senderName: string;
    }) => {
      if (data.tenantId !== tenantId) return;
      void qc.invalidateQueries({ queryKey: ["internal-conversations", tenantId] });
      void qc.invalidateQueries({
        queryKey: ["internal-messages", tenantId, data.conversationId],
      });
      // Only notify when not already looking at the internal chat page
      if (!location.startsWith("/equipe")) {
        playBeep();
        toast({
          title: `Mensagem interna de ${data.senderName}`,
          description:
            data.message.content.length > 80
              ? data.message.content.slice(0, 80) + "…"
              : data.message.content,
        });
      }
    };

    void getToken().then((token) => {
      if (cancelled) return;
      const socket = initSocket(token);
      socket.emit("join_tenant", tenantId);
      socket.on("internal_message", handler);
    });

    return () => {
      cancelled = true;
      getSocket()?.off("internal_message", handler);
    };
  }, [tenantId, qc, toast, getToken, location]);

  return (convs ?? []).reduce((sum, c) => sum + c.unreadCount, 0);
}
