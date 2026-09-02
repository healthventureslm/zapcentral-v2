import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, RefreshCw, Unplug, ExternalLink } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Input,
  Spinner,
} from "@healthventureslm/design-system";
import { PageShell } from "@/components/PageShell";
import { useToast } from "@/hooks/use-toast";
import { useTenantId, useMyRole } from "@/hooks/useTenantId";
import {
  getTelegramStatus,
  connectTelegram,
  refreshTelegramWebhook,
  disconnectTelegram,
} from "@/lib/api";

export default function TelegramConnectPage() {
  const tenantId = useTenantId();
  const role = useMyRole();
  const isAdmin = role === "admin" || role === "supervisor";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [token, setToken] = useState("");

  const statusQuery = useQuery({
    queryKey: ["telegram-status", tenantId],
    enabled: tenantId !== null,
    queryFn: () => getTelegramStatus(tenantId!),
    refetchInterval: 30_000,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["telegram-status", tenantId] });

  const connectMutation = useMutation({
    mutationFn: () => connectTelegram(tenantId!, token.trim()),
    onSuccess: () => {
      setToken("");
      toast({ title: "Telegram conectado", description: "O bot está recebendo mensagens." });
      void invalidate();
    },
    onError: (err: Error & { body?: { error?: string; hint?: string } }) => {
      toast({
        variant: "destructive",
        title: "Não foi possível conectar",
        description: err.body?.hint ?? err.message,
      });
    },
  });

  const refreshMutation = useMutation({
    mutationFn: () => refreshTelegramWebhook(tenantId!),
    onSuccess: () => {
      toast({ title: "Webhook reapontado", description: "O Telegram voltou a entregar aqui." });
      void invalidate();
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Falha ao reapontar", description: err.message });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => disconnectTelegram(tenantId!),
    onSuccess: () => {
      toast({ title: "Telegram desconectado" });
      void invalidate();
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Falha ao desconectar", description: err.message });
    },
  });

  const status = statusQuery.data;
  const bot = status?.bot ?? null;

  if (!isAdmin) {
    return (
      <PageShell title="Telegram" icon={<Send />}>
        <EmptyState
          title="Acesso restrito"
          description="Apenas administradores e supervisores podem gerenciar canais."
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      icon={<Send />}
      title="Telegram"
      subtitle="Conecte um bot para atender pelo Telegram. WhatsApp e Telegram podem funcionar juntos ou separadamente."
    >
          {statusQuery.isLoading ? (
            <Card>
              <CardBody>
                <div className="py-12 flex justify-center">
                  <Spinner />
                </div>
              </CardBody>
            </Card>
          ) : status?.connected && bot ? (
            <>
              <Card>
                <CardHeader
                  title="Bot conectado"
                  action={
                    <Badge variant="positive" dot>
                      Ativo
                    </Badge>
                  }
                />
                <CardBody>
                  <dl className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-[var(--text-muted)]">Nome</dt>
                      <dd className="font-medium">{bot.botFirstName}</dd>
                    </div>
                    {bot.botUsername && (
                      <div className="flex justify-between items-center">
                        <dt className="text-[var(--text-muted)]">Usuário</dt>
                        <dd>
                          <a
                            className="hv-link inline-flex items-center gap-1"
                            href={`https://t.me/${bot.botUsername}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            @{bot.botUsername}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </dd>
                      </div>
                    )}
                    {status.pendingUpdates != null && (
                      <div className="flex justify-between">
                        <dt className="text-[var(--text-muted)]">Updates pendentes</dt>
                        {/* Mono para dado numerico, conforme o guia do design system */}
                        <dd className="font-mono">{status.pendingUpdates}</dd>
                      </div>
                    )}
                    <div className="pt-3 border-t border-[var(--border-subtle)]">
                      <dt className="text-[var(--text-muted)] mb-1">Webhook</dt>
                      <dd className="font-mono text-xs break-all">{bot.webhookUrl}</dd>
                    </div>
                  </dl>
                </CardBody>
              </Card>

              {status.webhookStale && (
                <Card accent>
                  <CardHeader
                    title="O webhook não aponta mais para cá"
                    action={<Badge variant="warning">Atenção</Badge>}
                  />
                  <CardBody>
                    <p className="text-sm">
                      Isso acontece quando o endereço público muda — o túnel do
                      ngrok gratuito troca a cada reinício. Reaponte para voltar
                      a receber mensagens.
                    </p>
                    {status.remoteUrl && (
                      <p className="font-mono text-xs break-all mt-2 text-[var(--text-muted)]">
                        Registrado hoje: {status.remoteUrl}
                      </p>
                    )}
                    <div className="mt-4">
                      <Button
                        variant="primary"
                        loading={refreshMutation.isPending}
                        iconLeft={<RefreshCw className="w-4 h-4" />}
                        onClick={() => refreshMutation.mutate()}
                      >
                        Reapontar webhook
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              )}

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  loading={refreshMutation.isPending}
                  iconLeft={<RefreshCw className="w-4 h-4" />}
                  onClick={() => refreshMutation.mutate()}
                >
                  Reapontar webhook
                </Button>
                <Button
                  variant="danger"
                  loading={disconnectMutation.isPending}
                  iconLeft={<Unplug className="w-4 h-4" />}
                  onClick={() => disconnectMutation.mutate()}
                >
                  Desconectar
                </Button>
              </div>
            </>
          ) : (
            <Card>
              <CardHeader title="Conectar um bot" />
              <CardBody>
                <ol className="text-sm space-y-2 list-decimal list-inside text-[var(--text-muted)]">
                  <li>
                    No Telegram, abra{" "}
                    <a
                      className="hv-link"
                      href="https://t.me/BotFather"
                      target="_blank"
                      rel="noreferrer"
                    >
                      @BotFather
                    </a>{" "}
                    e envie <code className="font-mono">/newbot</code>.
                  </li>
                  <li>Escolha um nome e um usuário para o bot.</li>
                  <li>Copie o token gerado e cole abaixo.</li>
                </ol>

                <div className="mt-4">
                  <Input
                    label="Token do bot"
                    hint="O token dá controle total do bot. Ele fica guardado apenas no servidor e nunca é devolvido para o navegador."
                    error={status?.bot?.lastError ?? undefined}
                    value={token}
                    onChange={(ev) => setToken(ev.target.value)}
                    placeholder="123456789:AAExemplo-de-token-do-BotFather"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>

                <div className="mt-4">
                  <Button
                    variant="primary"
                    disabled={!token.trim()}
                    loading={connectMutation.isPending}
                    iconLeft={<Send className="w-4 h-4" />}
                    onClick={() => connectMutation.mutate()}
                  >
                    Conectar
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}
    </PageShell>
  );
}
