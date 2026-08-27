import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Send,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Unplug,
  ExternalLink,
} from "lucide-react";
import { Sidebar } from "@/pages/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
      <div className="flex h-screen bg-[#F4F7F8]">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center p-8">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center text-slate-600">
              Apenas administradores e supervisores podem gerenciar canais.
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F4F7F8]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Send className="w-6 h-6 text-[#229ED9]" />
              Telegram
            </h1>
            <p className="text-slate-600 mt-1">
              Conecte um bot para atender pelo Telegram. WhatsApp e Telegram
              podem funcionar juntos ou separadamente.
            </p>
          </div>

          {statusQuery.isLoading ? (
            <Card>
              <CardContent className="py-12 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </CardContent>
            </Card>
          ) : status?.connected && bot ? (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Bot conectado</CardTitle>
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Ativo
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nome</span>
                    <span className="font-medium">{bot.botFirstName}</span>
                  </div>
                  {bot.botUsername && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Usuário</span>
                      <a
                        href={`https://t.me/${bot.botUsername}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-[#229ED9] hover:underline flex items-center gap-1"
                      >
                        @{bot.botUsername}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                  {status.pendingUpdates != null && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Updates pendentes</span>
                      <span className="font-medium">{status.pendingUpdates}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t">
                    <span className="text-slate-500 block mb-1">Webhook</span>
                    <code className="text-xs break-all text-slate-700">
                      {bot.webhookUrl}
                    </code>
                  </div>
                </CardContent>
              </Card>

              {status.webhookStale && (
                <Card className="border-amber-300 bg-amber-50">
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex gap-2 text-amber-900">
                      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium">O webhook não aponta mais para cá.</p>
                        <p className="mt-1">
                          Isso acontece quando o endereço público muda — o túnel
                          do ngrok gratuito troca a cada reinício. Reaponte para
                          voltar a receber mensagens.
                        </p>
                        {status.remoteUrl && (
                          <code className="text-xs break-all block mt-2">
                            Registrado hoje: {status.remoteUrl}
                          </code>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => refreshMutation.mutate()}
                      disabled={refreshMutation.isPending}
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      {refreshMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      Reapontar webhook
                    </Button>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => refreshMutation.mutate()}
                  disabled={refreshMutation.isPending}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reapontar webhook
                </Button>
                <Button
                  variant="outline"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => disconnectMutation.mutate()}
                  disabled={disconnectMutation.isPending}
                >
                  {disconnectMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Unplug className="w-4 h-4 mr-2" />
                  )}
                  Desconectar
                </Button>
              </div>
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Conectar um bot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* O aviso vem ANTES do passo a passo.
                    Sem ele, quem esta demonstrando cria o bot no BotFather, cola
                    o token e so entao descobre que o Telegram nao alcanca este
                    servidor — com um bot ja criado e nenhuma pista do motivo. */}
                {status && status.webhookAlcancavel === false && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start gap-2 text-amber-800">
                      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-semibold mb-1">
                          O Telegram ainda não consegue alcançar este servidor
                        </p>
                        <p className="mb-2">{status.webhookMotivo}</p>
                        {status.urlPublica && (
                          <p className="mb-2 text-xs">
                            URL configurada agora:{" "}
                            <code className="bg-amber-100 px-1 rounded">
                              {status.urlPublica}
                            </code>
                          </p>
                        )}
                        <p className="text-xs leading-relaxed">
                          Publique este servidor numa URL HTTPS pública (ou abra
                          um túnel para ela), defina <code>PUBLIC_URL</code> com
                          esse endereço e reinicie. O <strong>WhatsApp</strong> e o{" "}
                          <strong>Simulador</strong> não dependem disso e
                          funcionam agora.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
                  <li>
                    No Telegram, abra{" "}
                    <a
                      href="https://t.me/BotFather"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#229ED9] hover:underline"
                    >
                      @BotFather
                    </a>{" "}
                    e envie <code className="bg-slate-100 px-1 rounded">/newbot</code>.
                  </li>
                  <li>Escolha um nome e um usuário para o bot.</li>
                  <li>Copie o token gerado e cole abaixo.</li>
                </ol>

                <div className="space-y-2">
                  <Label htmlFor="botToken">Token do bot</Label>
                  <Input
                    id="botToken"
                    value={token}
                    onChange={(ev) => setToken(ev.target.value)}
                    placeholder="123456789:AAExemplo-de-token-do-BotFather"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <p className="text-xs text-slate-500">
                    O token dá controle total do bot. Ele fica guardado apenas
                    no servidor e nunca é devolvido para o navegador.
                  </p>
                </div>

                {status?.bot?.lastError && (
                  <p className="text-sm text-red-600">{status.bot.lastError}</p>
                )}

                <Button
                  onClick={() => connectMutation.mutate()}
                  disabled={!token.trim() || connectMutation.isPending}
                  className="bg-[#229ED9] hover:bg-[#1b87ba]"
                >
                  {connectMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Conectar
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
