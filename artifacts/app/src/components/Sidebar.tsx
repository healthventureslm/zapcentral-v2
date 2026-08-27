/**
 * Barra de navegacao do produto.
 *
 * Vivia dentro de dashboard.tsx, o que obrigava toda tela a importar a
 * navegacao de uma pagina — e impedia extrair um involucro comum sem import
 * circular.
 */
import { useClerk, useUser } from "@/lib/devAuth";
import { useLocation } from "wouter";
import {
  LayoutDashboard,
  MessageCircle,
  Users,
  BarChart3,
  Settings,
  Smartphone,
  Send,
  Headset,
  ListTree,
  PlayCircle,
  LogOut,
} from "lucide-react";
import { SidebarNav } from "@healthventureslm/design-system";
import { useInternalChatNotifications } from "@/hooks/useInternalChat";
import { useTenantId, useMyRole } from "@/hooks/useTenantId";

const navItems = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Atendimento", path: "/atendimento", icon: MessageCircle },
  { name: "Equipe", path: "/equipe", icon: Headset },
  { name: "WhatsApp", path: "/whatsapp", icon: Smartphone },
  { name: "Telegram", path: "/telegram", icon: Send },
  { name: "Atendimento automático", path: "/configuracoes-canal", icon: ListTree },
  { name: "Simulador", path: "/simulador", icon: PlayCircle },
  { name: "Contatos", path: "/crm", icon: Users },
  { name: "Relatórios", path: "/relatorios", icon: BarChart3 },
  { name: "Configurações", path: "/settings", icon: Settings },
];

/** Iniciais para o bloco de usuario do rodape. */
function iniciaisDe(nome: string | null | undefined): string {
  if (!nome) return "?";
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? "") : "";
  return (primeira + ultima).toUpperCase() || "?";
}

const ROTULO_DO_PAPEL: Record<string, string> = {
  admin: "Administrador",
  supervisor: "Supervisor",
  agent: "Atendente",
};

export function Sidebar() {
  const [location, setLocation] = useLocation();
  const tenantId = useTenantId();
  const internalUnread = useInternalChatNotifications(tenantId);
  const { user } = useUser();
  const { signOut } = useClerk();
  const papel = ROTULO_DO_PAPEL[useMyRole() ?? ""];

  // O item ativo: prefixo conta, menos para "/", que so casa exato — senao a
  // raiz ficaria ativa em todas as telas.
  const ativo =
    navItems.find((i) =>
      i.path === "/" ? location === "/" : location.startsWith(i.path),
    )?.path ?? "/";

  return (
    // O SidebarNav nao se posiciona: e `width: var(--sidebar-width); height:
    // 100%`, feito para viver num flex row. As paginas aqui assumem uma barra
    // fixa e compensam com `ml-64`, entao o invólucro fixo continua, e a
    // largura do token esta igualada a 16rem no index.css.
    <div className="fixed inset-y-0 left-0 z-10 print:hidden">
      <SidebarNav
        brand={{ title: "ZapCentral" }}
        activeId={ativo}
        // Estado nao controlado: o proprio componente guarda e restaura o
        // colapso. O conteudo das paginas acompanha por CSS — ver a regra de
        // `.ml-64` no index.css.
        collapsible
        persistKey="zapcentral-sidebar"
        // Sem `href` de proposito: com ele o componente nao chama
        // preventDefault e o navegador recarrega a pagina inteira, matando a
        // navegacao do SPA. O roteamento fica com o wouter.
        onSelect={(id) => setLocation(id)}
        items={navItems.map((item) => {
          const Icon = item.icon;
          return {
            id: item.path,
            label: item.name,
            icon: <Icon className="w-5 h-5" />,
            ...(item.path === "/equipe" && internalUnread > 0
              ? { count: internalUnread }
              : {}),
          };
        })}
        // O nome de quem esta logado, e nao "Minha conta": numa demonstracao
        // com duas telas lado a lado, saber quem e cada janela e o que faz a
        // transferencia entre atendentes ficar legivel.
        //
        // O papel entra junto porque muda o que a pessoa ve: um agente nao
        // enxerga relatorios nem a fila dos outros ramais, e sem isso na tela
        // a diferenca so aparece quando algo falta.
        user={{
          name: user?.fullName ?? "Minha conta",
          initials: iniciaisDe(user?.fullName),
          ...(papel ? { role: papel } : {}),
          ...(user?.imageUrl ? { avatarSrc: user.imageUrl } : {}),
        }}
        // Sair como acao, e nao o UserButton inteiro: ele traz o proprio
        // avatar, que ficaria lado a lado com o do bloco de usuario — dois
        // retratos da mesma pessoa, um deles sem funcao.
        userActions={[
          {
            id: "sair",
            icon: <LogOut className="w-4 h-4" />,
            label: "Sair",
            onClick: () => void signOut(),
          },
        ]}
      />
    </div>
  );
}
