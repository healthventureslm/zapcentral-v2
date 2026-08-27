/**
 * Fachada sobre `@clerk/react`.
 *
 * Com VITE_DEV_AUTH_BYPASS=1 exporta stubs locais; sem ela, reexporta o Clerk
 * de verdade. As paginas importam daqui e nao sabem qual dos dois esta ativo.
 *
 * Cada stub implementa apenas a parcela da API que o projeto usa. Se alguma
 * pagina passar a usar mais campos do Clerk, e aqui que eles entram.
 */
import { type ReactNode } from "react";
import {
  ClerkProvider as RealClerkProvider,
  useAuth as useRealAuth,
  useUser as useRealUser,
  useClerk as useRealClerk,
  UserButton as RealUserButton,
} from "@clerk/react";
import {
  DEV_AUTH_BYPASS,
  getDevUser,
  signOutDevUser,
} from "./devUser";

export { DEV_AUTH_BYPASS };

// ---------------------------------------------------------------------------
// Stubs
// ---------------------------------------------------------------------------

function devSignOut(): Promise<void> {
  signOutDevUser();
  window.location.href = "/sign-in";
  return Promise.resolve();
}

function useDevAuth() {
  const user = getDevUser();
  return {
    isLoaded: true,
    isSignedIn: user !== null,
    userId: user?.id ?? null,
    // O "token" e o proprio id: o servidor em modo bypass o aceita
    // diretamente no handshake do Socket.io.
    getToken: () => Promise.resolve(user?.id ?? null),
    signOut: devSignOut,
  };
}

function useDevUser() {
  const user = getDevUser();
  if (!user) return { isLoaded: true, isSignedIn: false, user: null };

  return {
    isLoaded: true,
    isSignedIn: true,
    user: {
      id: user.id,
      fullName: user.name || user.email,
      imageUrl: "",
      primaryEmailAddress: { emailAddress: user.email },
    },
  };
}

function useDevClerk() {
  return { signOut: devSignOut };
}

function DevUserButton() {
  const user = getDevUser();
  const initials = (user?.name || user?.email || "DEV")
    .substring(0, 2)
    .toUpperCase();

  return (
    <button
      type="button"
      onClick={() => void devSignOut()}
      title={`${user?.email ?? "dev"} — clique para sair`}
      className="w-8 h-8 rounded-full bg-[#25D366] text-white text-xs font-semibold flex items-center justify-center hover:opacity-80 transition-opacity"
    >
      {initials}
    </button>
  );
}

/** No bypass o provider e um passa-adiante: nao ha SDK para inicializar. */
function DevClerkProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// Selecao — a flag e constante em tempo de build, entao a ordem dos hooks
// permanece estavel entre renders.
// ---------------------------------------------------------------------------

export const ClerkProvider = (
  DEV_AUTH_BYPASS ? DevClerkProvider : RealClerkProvider
) as typeof RealClerkProvider;

export const useAuth = (
  DEV_AUTH_BYPASS ? useDevAuth : useRealAuth
) as typeof useRealAuth;

export const useUser = (
  DEV_AUTH_BYPASS ? useDevUser : useRealUser
) as typeof useRealUser;

export const useClerk = (
  DEV_AUTH_BYPASS ? useDevClerk : useRealClerk
) as typeof useRealClerk;

export const UserButton = (
  DEV_AUTH_BYPASS ? DevUserButton : RealUserButton
) as typeof RealUserButton;
