/**
 * Tela de login do bypass de desenvolvimento.
 *
 * Nao ha senha nem verificacao: voce declara quem e, e o app acredita. Serve
 * para testar o produto sem Clerk e para alternar entre identidades — abra
 * numa janela anonima para simular dois atendentes ao mesmo tempo.
 */
import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { signInDevUser } from "@/lib/devUser";

const SUGGESTIONS = [
  { email: "admin@dev.local", name: "Admin Dev" },
  { email: "agente1@dev.local", name: "Agente Um" },
  { email: "agente2@dev.local", name: "Agente Dois" },
];

export default function DevSignInPage() {
  const [email, setEmail] = useState("admin@dev.local");
  const [name, setName] = useState("Admin Dev");

  function enter(withEmail: string, withName: string) {
    signInDevUser(withEmail.trim(), withName.trim());
    // Recarrega em vez de navegar: zera o cache do React Query e faz o
    // TenantGuard reavaliar a sessao do zero.
    window.location.href = "/";
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-b from-[#0F1923] to-[#1a2735] p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#25D366] rounded-2xl mb-2">
            <ShieldAlert className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">ZapCentral</h1>
          <p className="text-[#8899A6] text-sm">
            Modo de desenvolvimento — sem autenticação real
          </p>
        </div>

        <Card className="border-[#2a3a4a] bg-[#0F1923]">
          <CardContent className="pt-6 space-y-4">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-200 text-xs leading-relaxed">
              <strong>DEV_AUTH_BYPASS está ativo.</strong> Qualquer identidade
              digitada aqui é aceita sem senha. Nunca use esta configuração em
              produção.
            </div>

            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (email.trim()) enter(email, name);
              }}
            >
              <div className="space-y-1">
                <label className="text-xs text-[#8899A6]">E-mail</label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@dev.local"
                  className="bg-[#1a2735] border-[#2a3a4a] text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[#8899A6]">Nome</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu Nome"
                  className="bg-[#1a2735] border-[#2a3a4a] text-white"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-[#25D366] hover:bg-[#1aab4e] text-white font-semibold"
              >
                Entrar
              </Button>
            </form>

            <div className="pt-2 border-t border-[#2a3a4a] space-y-2">
              <p className="text-xs text-[#8899A6]">Identidades rápidas:</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.email}
                    type="button"
                    onClick={() => enter(s.email, s.name)}
                    className="text-xs px-2 py-1 rounded border border-[#2a3a4a] text-[#8899A6] hover:text-white hover:border-[#25D366] transition-colors"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
