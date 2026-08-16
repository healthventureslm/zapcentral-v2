import { ClerkProvider, useAuth } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch, useLocation, Router as WouterRouter } from "wouter";
import { useEffect, type ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { getClerkProxyUrl } from "@/lib/clerk";

import SignInPage from "@/pages/sign-in";
import SignUpPage from "@/pages/sign-up";
import DashboardPage from "@/pages/dashboard";
import SettingsPage from "@/pages/settings";
import ChatPage from "@/pages/chat";
import InternalChatPage from "@/pages/internal-chat";
import WhatsAppConnectPage from "@/pages/whatsapp-connect";
import ChannelSettingsPage from "@/pages/channel-settings";
import ContactsPage from "@/pages/crm/contacts";
import ContactDetailPage from "@/pages/crm/contact-detail";
import KanbanPage from "@/pages/crm/kanban";
import ReportsPage from "@/pages/reports";
import QrPublicPage from "@/pages/qr-public";

const queryClient = new QueryClient();

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = getClerkProxyUrl();

export const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// Clerk passes full paths to routerPush/routerReplace, but wouter's
// setLocation prepends the base — strip it to avoid doubling.
function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isSignedIn, isLoaded } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setLocation("/sign-in");
    }
  }, [isLoaded, isSignedIn, setLocation]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F7F8]">
        <div className="w-8 h-8 border-2 border-[#25D366] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isSignedIn) return null;

  return <Component />;
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
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
