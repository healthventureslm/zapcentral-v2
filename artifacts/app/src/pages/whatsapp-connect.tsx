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
import {
  Badge,
  Banner,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Input,
} from "@healthventureslm/design-system";
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
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-primary" />
            Divulgue sua central
          </span>
        }
        subtitle="Compartilhe ou imprima a página pública de QR code — quem escanear abre uma conversa direto com o WhatsApp da central."
      />
      <CardBody className="space-y-4">
        <Input
          label="Mensagem inicial pré-preenchida (opcional)"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          maxLength={200}
          placeholder="Ex: Olá! Gostaria de atendimento."
        />

        <div className="flex flex-wrap gap-3">
          {/*
           * Abrir a pagina do QR e navegar, nao acionar: precisa continuar
           * sendo <a> para abrir em outra aba e para o menu de contexto.
           */}
          <a href={pageUrl} target="_blank" rel="noopener noreferrer">
            <Button iconLeft={<QrCode className="w-4 h-4" />}>Abrir página do QR</Button>
          </a>
          <Button
            variant="secondary"
            iconLeft={<Copy className="w-4 h-4" />}
            onClick={() => {
              void navigator.clipboard.writeText(pageUrl);
              toast({ title: "Link copiado!" });
            }}
          >
            Copiar link
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

const STATUS_INFO: Record<
  string,
  { label: string; icon: React.ReactNode; variant: "positive" | "warning" | "neutral" | "danger" }
> = {
  connected: {
    label: "Conectado",
    icon: <CheckCircle2 className="w-4 h-4" />,
    variant: "positive",
  },
  connecting: {
    label: "Conectando...",
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    variant: "warning",
  },
  disconnected: {
    label: "Desconectado",
    icon: <WifiOff className="w-4 h-4" />,
    variant: "neutral",
  },
  error: {
    label: "Erro de conexão",
    icon: <AlertTriangle className="w-4 h-4" />,
    variant: "danger",
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
    <PageShell title="WhatsApp" icon={<Smartphone />}>
          <Card>
            <CardHeader
              title="Status da conexão"
              {...(instance?.phoneNumber ? { subtitle: `Número: ${instance.phoneNumber}` } : {})}
              action={
                <Badge variant={statusInfo.variant} className="gap-1.5">
                  {statusInfo.icon}
                  {statusInfo.label}
                </Badge>
              }
            />
            <CardBody className="space-y-4">
              {!statusData?.evolutionConfigured && (
                <Banner
                  variant="warning"
                  icon={<AlertTriangle className="w-4 h-4" />}
                  title="Evolution API não configurada"
                  description={
                    <>
                      Configure as variáveis de ambiente <code className="font-mono">EVOLUTION_API_URL</code> e{" "}
                      <code className="font-mono">EVOLUTION_API_KEY</code> para habilitar o WhatsApp.
                    </>
                  }
                />
              )}

              <div className="flex gap-3">
                {status !== "connected" && (
                  <Button
                    iconLeft={<Smartphone className="w-4 h-4" />}
                    loading={connectMutation.isPending}
                    disabled={!statusData?.evolutionConfigured}
                    onClick={() => connectMutation.mutate()}
                  >
                    Conectar WhatsApp
                  </Button>
                )}

                {status === "connected" && (
                  <Button
                    variant="danger"
                    iconLeft={<X className="w-4 h-4" />}
                    loading={disconnectMutation.isPending}
                    onClick={() => disconnectMutation.mutate()}
                  >
                    Desconectar
                  </Button>
                )}

                {(status === "connecting" || polling) && !qrCode && (
                  <Button
                    variant="secondary"
                    iconLeft={<RefreshCw className="w-4 h-4" />}
                    onClick={() => void pollQr()}
                  >
                    Atualizar QR
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>

          {/* QR Code */}
          {qrCode && status !== "connected" && (
            <Card>
              <CardHeader
                title="Escaneie o QR Code"
                subtitle="Abra o WhatsApp no seu celular → Menu → Aparelhos Conectados → Conectar aparelho"
              />
              <CardBody>
                <div className="flex justify-center">
                  <div className="p-4 bg-[var(--surface-canvas)] border-2 border-[var(--border-default)] rounded-xl inline-block">
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
              </CardBody>
            </Card>
          )}

          {/* Connected state */}
          {status === "connected" && (
            <EmptyState
              variant="card"
              icon={<CheckCircle2 className="w-8 h-8" />}
              title="WhatsApp conectado com sucesso!"
              description="Seu número está ativo e pronto para receber mensagens."
            >
              {instance?.phoneNumber && (
                <span className="text-[var(--petrol-700)] font-semibold text-lg">
                  {instance.phoneNumber}
                </span>
              )}
            </EmptyState>
          )}

          {/* Share QR page */}
          {status === "connected" && tenantId && (
            <ShareQrCard tenantId={tenantId} />
          )}

          {/* Instructions */}
          {status === "disconnected" && !qrCode && (
            <Card>
              <CardHeader title="Como conectar" />
              <CardBody>
                <ol className="space-y-3">
                {[
                  'Clique em "Conectar WhatsApp"',
                  "Abra o WhatsApp no seu celular",
                  "Vá em Menu (3 pontos) → Aparelhos Conectados",
                  'Toque em "Conectar aparelho"',
                  "Escaneie o QR Code exibido aqui",
                ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <span className="w-6 h-6 rounded-full bg-[var(--petrol-100)] text-[var(--petrol-700)] font-semibold flex items-center justify-center text-xs shrink-0">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </CardBody>
            </Card>
          )}
    </PageShell>
  );
}
