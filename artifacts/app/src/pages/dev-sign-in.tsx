/**
 * Tela de login do bypass de desenvolvimento.
 *
 * Nao ha senha nem verificacao: voce declara quem e, e o app acredita. Serve
 * para testar o produto sem Clerk e para alternar entre identidades — abra
 * numa janela anonima para simular dois atendentes ao mesmo tempo.
 */
import {
  Button,
  Card,
  CardBody,
  Input,
} from "@healthventureslm/design-system";
import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { signInDevUser } from "@/lib/devUser";

/**
 * A equipe criada pelo seed (`lib/db/src/seedDemo.ts`).
 *
 * A identidade e derivada de e-mail E nome juntos, entao digitar o nome com um
 * acento a menos gera outro usuario — sem vinculo com a central, e a pessoa cai
 * em "Acesso pendente" sem entender por que. Clicar no nome elimina o erro de
 * digitacao. Manter esta lista igual a do seed.
 */
const SUGGESTIONS = [
  { email: "marcelo@hospital.local", name: "Marcelo Kalichsztein", papel: "administrador" },
  { email: "carla.nogueira@hospital.local", name: "Carla Nogueira", papel: "supervisora" },
  { email: "ana.rocha@hospital.local", name: "Ana Beatriz Rocha", papel: "atendente" },
  { email: "rafael.menezes@hospital.local", name: "Rafael Menezes", papel: "atendente" },
  { email: "diego.ferraz@hospital.local", name: "Diego Ferraz", papel: "atendente" },
];

export default function DevSignInPage() {
  const [email, setEmail] = useState(SUGGESTIONS[0]!.email);
  const [name, setName] = useState(SUGGESTIONS[0]!.name);

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
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-2xl mb-2">
            <ShieldAlert className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">ZapCentral</h1>
          <p className="text-muted-foreground text-sm">
            Modo de desenvolvimento — sem autenticação real
          </p>
        </div>

        <Card className="border-[#2a3a4a] bg-[#0F1923]">
          <CardBody className="pt-6 space-y-4">
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
                <label className="text-xs text-muted-foreground">E-mail</label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@dev.local"
                  className="bg-[#1a2735] border-[#2a3a4a] text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Nome</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu Nome"
                  className="bg-[#1a2735] border-[#2a3a4a] text-white"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-[#1aab4e] text-white font-semibold"
              >
                Entrar
              </Button>
            </form>

            <div className="pt-2 border-t border-[#2a3a4a] space-y-2">
              <p className="text-xs text-muted-foreground">
                Ou entre com um clique — a equipe da central:
              </p>
              <div className="space-y-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.email}
                    type="button"
                    onClick={() => enter(s.email, s.name)}
                    className="w-full text-left px-3 py-2 rounded border border-[#2a3a4a] hover:border-primary transition-colors group"
                  >
                    <span className="text-sm text-white group-hover:text-primary">
                      {s.name}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">{s.papel}</span>
                  </button>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
