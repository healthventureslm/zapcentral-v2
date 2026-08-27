import { ClerkProvider, useAuth } from "@/lib/devAuth";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Route, Switch, useLocation, Router as WouterRouter } from "wouter";
import { useEffect, type ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { getClerkProxyUrl } from "@/lib/clerk";
import { API_BASE, authHeaders } from "@/lib/apiBase";

import SignInPage from "@/pages/sign-in";
import SignUpPage from "@/pages/sign-up";
import DashboardPage from "@/pages/dashboard";
import SettingsPage from "@/pages/settings";
import ChatPage from "@/pages/chat";
import InternalChatPage from "@/pages/internal-chat";
import WhatsAppConnectPage from "@/pages/whatsapp-connect";
import TelegramConnectPage from "@/pages/telegram-connect";
import ChannelSettingsPage from "@/pages/channel-settings";
import ContactsPage from "@/pages/crm/contacts";
import ContactDetailPage from "@/pages/crm/contact-detail";
import KanbanPage from "@/pages/crm/kanban";
import ReportsPage from "@/pages/reports";
import SimuladorPage from "@/pages/simulador";
import QrPublicPage from "@/pages/qr-public";
import SetupPage from "@/pages/setup";
import NoAccessPage from "@/pages/no-access";
import { shadcn } from "@clerk/themes";

const queryClient = new QueryClient();

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = getClerkProxyUrl();

export const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#25D366",
    colorForeground: "#ffffff",
    colorMutedForeground: "#8899A6",
    colorDanger: "#ef4444",
    colorBackground: "#0F1923",
    colorInput: "#1a2735",
    colorInputForeground: "#ffffff",
    colorNeutral: "#2a3a4a",
    fontFamily: "inherit",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#0F1923] border border-[#2a3a4a] rounded-2xl w-[440px] max-w-full overflow-hidden shadow-2xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-white font-bold",
    headerSubtitle: "text-[#8899A6]",
    socialButtonsBlockButtonText: "text-white",
    formFieldLabel: "text-[#8899A6]",
    footerActionLink: "text-[#25D366] hover:text-[#1aab4e]",
    footerActionText: "text-[#8899A6]",
    dividerText: "text-[#8899A6]",
    identityPreviewEditButton: "text-[#25D366]",
    formFieldSuccessText: "text-[#25D366]",
    alertText: "text-white",
    logoBox: "flex justify-center w-full mb-2",
    logoImage: "h-16 w-16",
    socialButtonsBlockButton: "border border-[#2a3a4a] bg-[#1a2735] hover:bg-[#243447] text-white",
    formButtonPrimary: "bg-[#25D366] hover:bg-[#1aab4e] text-white font-semibold",
    formFieldInput: "bg-[#1a2735] border-[#2a3a4a] text-white",
    footerAction: "bg-[#0a1520]",
    dividerLine: "bg-[#2a3a4a]",
    alert: "bg-[#1a2735] border-[#2a3a4a]",
    otpCodeFieldInput: "bg-[#1a2735] border-[#2a3a4a] text-white",
    formFieldRow: "text-white",
    main: "text-white",
  },
};
function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}



interface MeResponse {
  isSuperAdmin: boolean;
  tenants: { tenantId: number; tenantSlug: string; role: string; status: string }[];
}

interface OnboardStatus {
  bootstrapped: boolean;
}

/**
 * Checks whether the signed-in user has a real tenant membership.
 * If not, redirects to /setup (platform virgin) or /sem-acesso (already bootstrapped).
 * Children are only rendered when the user has an active real tenant.
 */
function TenantGuard({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const [, setLocation] = useLocation();

  const meQuery = useQuery<MeResponse>({
    queryKey: ["me"],
    enabled: isLoaded && !!isSignedIn,
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/me`, {
        credentials: "include",
        headers: await authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch /me");
      return res.json() as Promise<MeResponse>;
    },
    staleTime: 30_000,
    retry: 2,
  });

  const hasRealTenant =
    meQuery.data?.tenants.some(
      (t) => t.status === "active" && t.tenantSlug !== "system",
    ) ?? false;

  const statusQuery = useQuery<OnboardStatus>({
    queryKey: ["onboard-status"],
    // Only fetch if user is signed in and has NO real tenant (and me is loaded)
    enabled: isLoaded && !!isSignedIn && meQuery.isSuccess && !hasRealTenant,
    queryFn: async () => {
      // Rota publica, mas os headers de transporte continuam necessarios:
      // sem eles um tunel ngrok devolve a propria pagina de aviso, que vem
      // sem cabecalho de CORS e derruba a requisicao.
      const res = await fetch(`${API_BASE}/onboard/status`, {
        headers: await authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch onboard status");
      return res.json() as Promise<OnboardStatus>;
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLocation("/sign-in");
      return;
    }
    if (!meQuery.isSuccess) return;
    if (hasRealTenant) return; // already in the app normally

    if (!statusQuery.isSuccess) return;

    if (!statusQuery.data.bootstrapped) {
      setLocation("/setup");
    } else {
      setLocation("/sem-acesso");
    }
  }, [isLoaded, isSignedIn, meQuery.isSuccess, hasRealTenant, statusQuery.isSuccess, statusQuery.data, setLocation]);

  // Loading spinner while determining state
  if (!isLoaded || (isSignedIn && (!meQuery.isSuccess || (!hasRealTenant && !statusQuery.isSuccess)))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F7F8]">
        <div className="w-8 h-8 border-2 border-[#25D366] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isSignedIn || !hasRealTenant) return null;

  return <>{children}</>;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <TenantGuard>
      <Component />
    </TenantGuard>
  );
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/setup" component={SetupPage} />
      <Route path="/sem-acesso" component={NoAccessPage} />
      <Route path="/settings">
        <ProtectedRoute component={SettingsPage} />
      </Route>
      <Route path="/equipe">
        <ProtectedRoute component={InternalChatPage} />
      </Route>
      <Route path="/atendimento">
        <ProtectedRoute component={ChatPage} />
      </Route>
      <Route path="/whatsapp">
        <ProtectedRoute component={WhatsAppConnectPage} />
      </Route>
      <Route path="/telegram">
        <ProtectedRoute component={TelegramConnectPage} />
      </Route>
      <Route path="/configuracoes-canal">
        <ProtectedRoute component={ChannelSettingsPage} />
      </Route>
      <Route path="/crm/contatos/:id">
        <ProtectedRoute component={ContactDetailPage} />
      </Route>
      <Route path="/crm/funil">
        <ProtectedRoute component={KanbanPage} />
      </Route>
      <Route path="/crm">
        <ProtectedRoute component={ContactsPage} />
      </Route>
      <Route path="/qr/:token" component={QrPublicPage} />
      <Route path="/simulador">
        <ProtectedRoute component={SimuladorPage} />
      </Route>
      <Route path="/relatorios">
        <ProtectedRoute component={ReportsPage} />
      </Route>
      <Route path="/">
        <ProtectedRoute component={DashboardPage} />
      </Route>
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      localization={{
        signIn: {
          start: {
            title: "Bem-vindo de volta",
            subtitle: "Faça login para acessar sua conta",
          },
        },
        signUp: {
          start: {
            title: "Crie sua conta",
            subtitle: "Comece a usar o ZapCentral hoje",
          },
        },
      }}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      afterSignOutUrl={basePath || "/"}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AppRoutes />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}
