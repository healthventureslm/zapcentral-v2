/**
 * Camada de autenticacao intercambiavel: Clerk de verdade, ou um bypass local
 * para desenvolvimento.
 *
 * O bypass existe para permitir testar o fluxo completo do produto (IVR, fila,
 * atendimento, CRM, relatorios) sem depender de uma conta Clerk. Ele NAO
 * verifica senha nenhuma: quem controla o header `x-dev-user` vira aquele
 * usuario. Por isso o modulo se recusa a ligar em producao — ver a checagem
 * logo abaixo, que derruba o processo em vez de degradar silenciosamente.
 *
 * Ativacao: DEV_AUTH_BYPASS=1 com NODE_ENV != production.
 *
 * Identidade sem estado: o `userId` carrega o proprio email e nome codificados
 * em base64url, entao `clerkClient.users.getUser()` consegue reconstruir o
 * perfil sem banco, sem cache e sem registro previo.
 */
import {
  getAuth as clerkGetAuth,
  clerkClient as realClerkClient,
  verifyToken as clerkVerifyToken,
} from "@clerk/express";
import { type Request } from "express";

const bypassRequested = process.env["DEV_AUTH_BYPASS"] === "1";
const isProduction = process.env["NODE_ENV"] === "production";

if (bypassRequested && isProduction) {
  throw new Error(
    "DEV_AUTH_BYPASS=1 com NODE_ENV=production. O bypass de autenticacao " +
      "nao verifica credencial alguma e jamais deve rodar em producao. " +
      "Remova DEV_AUTH_BYPASS do ambiente.",
  );
}

/** true quando o bypass de desenvolvimento esta ativo. */
export const isDevAuthBypass = bypassRequested && !isProduction;

if (isDevAuthBypass) {
  // Aviso deliberadamente barulhento — ninguem deve rodar isso sem saber.
  console.warn(
    "\n  ⚠  DEV_AUTH_BYPASS ATIVO — a API aceita qualquer identidade sem senha.\n" +
      "     Somente para desenvolvimento local.\n",
  );
}

const DEV_ID_PREFIX = "dev_";

/** Codifica email e nome dentro do proprio id, para um perfil sem estado. */
export function encodeDevUserId(email: string, name: string): string {
  return (
    DEV_ID_PREFIX + Buffer.from(`${email}|${name}`, "utf8").toString("base64url")
  );
}

interface DevProfile {
  email: string;
  firstName: string | null;
  lastName: string | null;
}

/** Reconstroi o perfil a partir do id. Tolerante a ids que nao decodificam. */
function decodeDevUserId(userId: string): DevProfile {
  const fallback: DevProfile = {
    email: `${userId}@dev.local`,
    firstName: userId,
    lastName: null,
  };

  if (!userId.startsWith(DEV_ID_PREFIX)) return fallback;

  try {
    const raw = Buffer.from(
      userId.slice(DEV_ID_PREFIX.length),
      "base64url",
    ).toString("utf8");
    const [email, name] = raw.split("|");
    if (!email) return fallback;

    const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
    return {
      email,
      firstName: parts[0] ?? email.split("@")[0] ?? null,
      lastName: parts.length > 1 ? parts.slice(1).join(" ") : null,
    };
  } catch {
    return fallback;
  }
}

/** Le a identidade que o frontend declarou no header (ou no cookie). */
function devUserIdFromRequest(req: Request): string | null {
  const header = req.headers["x-dev-user"];
  const fromHeader = Array.isArray(header) ? header[0] : header;
  if (fromHeader) return fromHeader;

  // Fallback por cookie — o handshake do Socket.io em polling e alguns
  // fetches nao carregam headers customizados.
  const cookie = req.headers.cookie;
  if (!cookie) return null;
  const match = /(?:^|;\s*)dev_user=([^;]*)/.exec(cookie);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

/**
 * Mesma assinatura de `getAuth` do Clerk, mas resolve pelo header quando o
 * bypass esta ativo. Os handlers de rota nao percebem a diferenca.
 */
export function getAuth(req: Request): { userId: string | null } {
  if (!isDevAuthBypass) return clerkGetAuth(req);
  return { userId: devUserIdFromRequest(req) };
}

/** Verifica o token do Socket.io. No bypass o "token" e o proprio id. */
export async function verifyToken(
  token: string,
  options: { secretKey?: string | undefined },
): Promise<{ sub?: string }> {
  if (!isDevAuthBypass) return clerkVerifyToken(token, options);
  return { sub: token };
}

// ---------------------------------------------------------------------------
// clerkClient — so os metodos que o projeto realmente usa
// ---------------------------------------------------------------------------

interface StubClerkUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  primaryEmailAddressId: string;
  emailAddresses: { id: string; emailAddress: string }[];
}

const devClerkClient = {
  users: {
    getUser(userId: string): Promise<StubClerkUser> {
      const profile = decodeDevUserId(userId);
      return Promise.resolve({
        id: userId,
        firstName: profile.firstName,
        lastName: profile.lastName,
        imageUrl: "",
        primaryEmailAddressId: "dev_email",
        emailAddresses: [{ id: "dev_email", emailAddress: profile.email }],
      });
    },
  },
  invitations: {
    // Sem servico de email no bypass. Rejeitar e o comportamento correto: o
    // chamador em routes/users.ts ja trata a falha como nao-fatal e cria o
    // convite pendente do mesmo jeito, que e o que permite o claim depois.
    createInvitation(): Promise<{ id: string }> {
      return Promise.reject(
        new Error("DEV_AUTH_BYPASS: convites por email desabilitados"),
      );
    },
  },
};

export const clerkClient = (
  isDevAuthBypass ? devClerkClient : realClerkClient
) as typeof realClerkClient;
