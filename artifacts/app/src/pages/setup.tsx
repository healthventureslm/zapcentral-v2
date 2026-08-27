/**
 * First-time platform setup page.
 * Shown to a signed-in user when no super-admin has been provisioned yet.
 * Calls POST /api/onboard/setup which atomically:
 *   1. Claims the super-admin bootstrap
 *   2. Creates the user's "central" (tenant)
 *   3. Adds the user as admin of that tenant
 */
import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { API_BASE, authHeaders } from "@/lib/apiBase";
import { basePath } from "@/App";



export default function SetupPage() {
  // A rota e publica e nao passa pelo TenantGuard, entao digitar /setup na
  // barra de enderecos exibia o formulario de configuracao inicial mesmo com a
  // central ja criada — parece que o sistema foi zerado. Plataforma ja
  // configurada volta para o painel.
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`${API_BASE}/onboard/status`, {
          headers: await authHeaders(),
        });
        if (!res.ok) return;
        const { bootstrapped } = (await res.json()) as { bootstrapped: boolean };
        if (bootstrapped) window.location.assign(basePath || "/");
      } catch {
        // Sem resposta da API, deixa o formulario visivel: melhor mostrar do
        // que travar quem realmente precisa configurar.
      }
    })();
  }, []);

  const [tenantName, setTenantName] = useState("");
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantName.trim() || !secret.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/onboard/setup`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(await authHeaders()),
        },
        body: JSON.stringify({ tenantName: tenantName.trim(), bootstrapSecret: secret }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        setError(body.error ?? "Erro ao configurar a plataforma.");
        return;
      }

      // Recarrega a pagina inteira em vez de navegar.
      //
      // Esta tela fica FORA do TenantGuard, entao as consultas dele (`me` e
      // `onboard/status`) estao inativas aqui — e `invalidateQueries` so marca
      // consulta inativa como obsoleta, sem recarregar. Ao navegar para "/", o
      // guard montava lendo o cache antigo, via "plataforma nao configurada" e
      // devolvia para /setup: a central era criada e a tela nao saia do lugar.
      //
      // Configuracao inicial acontece uma vez na vida da central; um recarregamento
      // custa nada e elimina a corrida inteira.
      window.location.assign(basePath || "/");
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo / header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-2xl mb-2">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Configuração inicial</h1>
          <p className="text-muted-foreground text-sm">
            Bem-vindo ao ZapCentral. Defina o nome da sua central para começar.
          </p>
        </div>

        <Card className="shadow-sm border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Criar a central</CardTitle>
            <CardDescription>
              Preencha os dados abaixo. Você precisará do segredo de ativação
              fornecido junto com o acesso à plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Nome da central
                </label>
                <Input
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  placeholder="Ex: Atendimento Loja Norte"
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Segredo de ativação
                </label>
                <Input
                  type="password"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-white font-medium"
                disabled={loading || !tenantName.trim() || !secret.trim()}
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Ativar plataforma
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          ZapCentral — Central Operacional Inteligente
        </p>
      </div>
    </div>
  );
}
