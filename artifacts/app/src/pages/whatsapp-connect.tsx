/**
 * WhatsApp connect page — QR code scanning to link WhatsApp.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Smartphone,
  RefreshCw,
  CheckCircle2,
  WifiOff,
  AlertTriangle,
  Loader2,
  X,
  QrCode,
  Copy,
} from "lucide-react";
import { useAuth } from "@/lib/devAuth";
import { PageShell } from "@/components/PageShell";
import { getWhatsAppStatus, connectWhatsApp, getWhatsAppQr, disconnectWhatsApp, getQrShareToken } from "@/lib/api";
import { useTenantId } from "@/hooks/useTenantId";
import { useToast } from "@/hooks/use-toast";
import { initSocket, getSocket, joinTenant } from "@/lib/socket";

function ShareQrCard({ tenantId }: { tenantId: number }) {
  const { toast } = useToast();
  const [msg, setMsg] = useState("Olá! Gostaria de atendimento.");

  const { data: share } = useQuery({
    queryKey: ["qr-share", tenantId],
    queryFn: () => getQrShareToken(tenantId),
  });

  const base = `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}`;
  const pageUrl = share
    ? `${base}/qr/${share.token}${msg.trim() ? `?msg=${encodeURIComponent(msg.trim())}` : ""}`
    : null;

  if (!pageUrl) return null;

  return (
    <div className="bg-card rounded-xl shadow-sm p-6 mt-6">
      <h2 className="font-semibold text-foreground mb-1 flex items-center gap-2">
        <QrCode className="w-4 h-4 text-primary" />
        Divulgue sua central
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Compartilhe ou imprima a página pública de QR code — quem escanear abre
        uma conversa direto com o WhatsApp da central.
      </p>

      <label className="text-xs font-medium text-muted-foreground block mb-1">
        Mensagem inicial pré-preenchida (opcional)
      </label>
      <input
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        maxLength={200}
        className="w-full border border-border rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-primary/40"
        placeholder="Ex: Olá! Gostaria de atendimento."
      />

      <div className="flex flex-wrap gap-3">
        <a
          href={pageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <QrCode className="w-4 h-4" />
          Abrir página do QR
        </a>
        <button
          onClick={() => {
            void navigator.clipboard.writeText(pageUrl);
            toast({ title: "Link copiado!" });
          }}
          className="border border-border hover:bg-muted text-foreground px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Copy className="w-4 h-4" />
          Copiar link
        </button>
      </div>
    </div>
  );
}

const STATUS_INFO: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  connected: {
    label: "Conectado",
    icon: <CheckCircle2 className="w-5 h-5" />,
    color: "text-primary",
  },
  connecting: {
    label: "Conectando...",
    icon: <Loader2 className="w-5 h-5 animate-spin" />,
    color: "text-amber-400",
  },
  disconnected: {
    label: "Desconectado",
    icon: <WifiOff className="w-5 h-5" />,
    color: "text-muted-foreground",
  },
  error: {
    label: "Erro de conexão",
    icon: <AlertTriangle className="w-5 h-5" />,
    color: "text-red-400",
  },
};

export default function WhatsAppConnectPage() {
  const tenantId = useTenantId();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  const { data: statusData, isLoading } = useQuery({
    queryKey: ["whatsapp-status", tenantId],
    queryFn: () => (tenantId ? getWhatsAppStatus(tenantId) : null),
    enabled: !!tenantId,
    refetchInterval: 10_000,
  });

  const instance = statusData?.instance;
  // Sem provedor configurado nao existe conexao possivel, por mais que reste
  // uma instancia marcada como conectada no banco. Mostrar "Conectado" ao lado
  // do aviso de "Evolution nao configurada" e contraditorio, e faz alguem
  // confiar num canal que nao entrega nada.
  const status = !statusData?.evolutionConfigured
    ? "disconnected"
    : (instance?.status ?? "disconnected");

  // Auto-refresh QR when connecting
  const pollQr = useCallback(async () => {
    if (!tenantId) return;
    try {
      const data = await getWhatsAppQr(tenantId);
      if (data.status === "connected") {
        setPolling(false);
        setQrCode(null);
        void qc.invalidateQueries({ queryKey: ["whatsapp-status", tenantId] });
        toast({ title: "WhatsApp conectado!", description: `Número: ${data.phoneNumber ?? ""}` });
        return;
      }
      if (data.qrCode) setQrCode(data.qrCode);
    } catch {
      // Ignore polling errors
    }
  }, [tenantId, qc, toast]);

  useEffect(() => {
    if (polling && !pollingInterval) {
      const id = setInterval(() => void pollQr(), 3000);
      setPollingInterval(id);
    } else if (!polling && pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [polling, pollingInterval, pollQr]);

  const { getToken } = useAuth();
  // Socket.io events — authenticated with Clerk token
  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;

    getToken().then((token) => {
      if (cancelled) return;
      const socket = initSocket(token);
      joinTenant(socket, tenantId);

      socket.on("whatsapp_qr_updated", (data: { qrCode: string }) => {
        setQrCode(data.qrCode);
      });
      socket.on("whatsapp_status_changed", (data: { status: string }) => {
        void qc.invalidateQueries({ queryKey: ["whatsapp-status", tenantId] });
        if (data.status === "connected") {
          setPolling(false);
          setQrCode(null);
        }
      });
    });

    return () => {
      cancelled = true;
      const socket = getSocket();
      if (socket) {
        socket.off("whatsapp_qr_updated");
        socket.off("whatsapp_status_changed");
      }
    };
  }, [tenantId, getToken, qc]);

  const connectMutation = useMutation({
    mutationFn: () => connectWhatsApp(tenantId!),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ["whatsapp-status", tenantId] });
      if (data.qrCode) setQrCode(data.qrCode);
      setPolling(true);
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao conectar", description: err.message, variant: "destructive" });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => disconnectWhatsApp(tenantId!),
    onSuccess: () => {
      setQrCode(null);
      setPolling(false);
      void qc.invalidateQueries({ queryKey: ["whatsapp-status", tenantId] });
      toast({ title: "WhatsApp desconectado" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao desconectar", description: err.message, variant: "destructive" });
    },
  });

  const statusInfo = STATUS_INFO[status] ?? STATUS_INFO["disconnected"]!;

  return (
    <PageShell title="WhatsApp">
          {/* Status Card */}
          <div className="bg-card rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-foreground mb-1">Status da Conexão</h2>
                {instance?.phoneNumber && (
                  <p className="text-sm text-muted-foreground">Número: {instance.phoneNumber}</p>
                )}
              </div>
              <div className={`flex items-center gap-2 font-medium ${statusInfo.color}`}>
                {statusInfo.icon}
                <span>{statusInfo.label}</span>
              </div>
            </div>

            {!statusData?.evolutionConfigured && (
              <div className="mt-4 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Evolution API não configurada</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Configure as variáveis de ambiente <code className="font-mono bg-amber-100 px-1 rounded">EVOLUTION_API_URL</code> e{" "}
                    <code className="font-mono bg-amber-100 px-1 rounded">EVOLUTION_API_KEY</code> para habilitar o WhatsApp.
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              {status !== "connected" && (
                <button
                  onClick={() => connectMutation.mutate()}
                  disabled={connectMutation.isPending || !statusData?.evolutionConfigured}
                  className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  {connectMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Smartphone className="w-4 h-4" />
                  )}
                  Conectar WhatsApp
                </button>
              )}

              {status === "connected" && (
                <button
                  onClick={() => disconnectMutation.mutate()}
                  disabled={disconnectMutation.isPending}
                  className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  {disconnectMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                  Desconectar
                </button>
              )}

              {(status === "connecting" || polling) && !qrCode && (
                <button
                  onClick={() => void pollQr()}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground px-4 py-2 border rounded-lg"
                >
                  <RefreshCw className="w-4 h-4" />
                  Atualizar QR
                </button>
              )}
            </div>
          </div>

          {/* QR Code */}
          {qrCode && status !== "connected" && (
            <div className="bg-card rounded-xl shadow-sm p-6">
              <h2 className="font-semibold text-foreground mb-1">
                Escaneie o QR Code
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Abra o WhatsApp no seu celular → Menu → Aparelhos Conectados → Conectar aparelho
              </p>

              <div className="flex justify-center">
                <div className="p-4 bg-card border-2 border-border rounded-xl shadow-inner inline-block">
                  {qrCode.startsWith("data:image") ? (
                    <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                  ) : (
                    <div className="w-64 h-64 flex items-center justify-center text-xs text-muted-foreground break-all p-4 font-mono">
                      {qrCode.slice(0, 100)}...
                    </div>
                  )}
                </div>
              </div>

              <p className="text-xs text-center text-muted-foreground mt-4">
                O QR code expira em 60 segundos. Atualizando automaticamente...
              </p>
            </div>
          )}

          {/* Connected state */}
          {status === "connected" && (
            <div className="bg-card rounded-xl shadow-sm p-6">
              <div className="flex flex-col items-center text-center py-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-primary" />
                </div>
                <h2 className="font-semibold text-foreground mb-2">
                  WhatsApp conectado com sucesso!
                </h2>
                <p className="text-sm text-muted-foreground">
                  Seu número está ativo e pronto para receber mensagens.
                </p>
                {instance?.phoneNumber && (
                  <span className="mt-3 text-primary font-semibold text-lg">
                    {instance.phoneNumber}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Share QR page */}
          {status === "connected" && tenantId && (
            <ShareQrCard tenantId={tenantId} />
          )}

          {/* Instructions */}
          {status === "disconnected" && !qrCode && (
            <div className="bg-card rounded-xl shadow-sm p-6">
              <h2 className="font-semibold text-foreground mb-4">Como conectar</h2>
              <ol className="space-y-3">
                {[
                  'Clique em "Conectar WhatsApp"',
                  "Abra o WhatsApp no seu celular",
                  "Vá em Menu (3 pontos) → Aparelhos Conectados",
                  'Toque em "Conectar aparelho"',
                  "Escaneie o QR Code exibido aqui",
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-xs shrink-0">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}
    </PageShell>
  );
}
