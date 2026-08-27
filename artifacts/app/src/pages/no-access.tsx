/**
 * Shown when a signed-in user has no tenant membership and the platform
 * has already been bootstrapped (i.e. they need to be invited by an admin).
 */
import { useClerk } from "@/lib/devAuth";
import { LogOut, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NoAccessPage() {
  const { signOut } = useClerk();

  return (
    <div className="min-h-screen bg-[#F4F7F8] flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-gray-200 rounded-2xl">
          <MessageSquare className="w-7 h-7 text-gray-400" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-gray-900">Acesso pendente</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Sua conta ainda não tem acesso a nenhuma central.
            Peça ao administrador da sua empresa que envie um convite para o seu e-mail.
          </p>
        </div>

        <Button
          variant="outline"
          className="gap-2"
          onClick={() => void signOut()}
        >
          <LogOut className="w-4 h-4" />
          Sair da conta
        </Button>

        <p className="text-xs text-gray-400">ZapCentral — Central Operacional Inteligente</p>
      </div>
    </div>
  );
}
