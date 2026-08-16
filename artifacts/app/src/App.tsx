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

const queryClient = new QueryClient();

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = getClerkProxyUrl();

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
      <Route path="/">
        <ProtectedRoute component={DashboardPage} />
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} afterSignOutUrl="/sign-in">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppRoutes />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
