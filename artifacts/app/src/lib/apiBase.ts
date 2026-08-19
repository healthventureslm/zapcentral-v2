/**
 * Resolve onde a API vive e como autenticar com ela.
 *
 * Dois modos:
 *
 * 1. Mesma origem (local e Replit) — o prefixo `/api-server` e resolvido pelo
 *    proxy do Vite ou pelo router do Replit. A sessao viaja por cookie.
 *
 * 2. Origem separada (frontend no Vercel, API exposta por tunel) — definido
 *    por `VITE_API_BASE_URL`. O tunel aponta direto para o servidor, entao o
 *    prefixo `/api-server` nao existe.
 *
 * No modo 2 o cookie de sessao do Clerk NAO e enviado pelo navegador, porque
 * pertence a outra origem. Por isso mandamos o token no header Authorization,
 * que o clerkMiddleware aceita igualmente.
 */

/** URL da API quando ela vive em outra origem. Vazio = mesma origem. */
const EXTERNAL_API_URL = (import.meta.env.VITE_API_BASE_URL ?? "")
  .trim()
  .replace(/\/+$/, "");

/** true quando o frontend e a API estao em origens diferentes. */
export const isCrossOrigin = EXTERNAL_API_URL.length > 0;

/** Prefixo para todas as chamadas REST. */
export const API_BASE = isCrossOrigin
  ? `${EXTERNAL_API_URL}/api`
  : "/api-server/api";

/** Origem para o Socket.io. */
export const SOCKET_ORIGIN = isCrossOrigin
  ? EXTERNAL_API_URL
  : window.location.origin;

/** Path do Socket.io — segue o mesmo prefixo das chamadas REST. */
export const SOCKET_PATH = isCrossOrigin
  ? "/socket.io"
  : "/api-server/socket.io";

/**
 * Objeto global que o Clerk instala no window. Tipado apenas com o que
 * usamos aqui — o SDK React nao expoe getToken fora de componentes.
 */
interface ClerkGlobal {
  session?: { getToken: () => Promise<string | null> } | null;
}

/**
 * Token de sessao para o header Authorization.
 * Só é necessario no modo cross-origin; na mesma origem o cookie resolve.
 */
export async function getSessionToken(): Promise<string | null> {
  if (!isCrossOrigin) return null;
  const clerk = (window as unknown as { Clerk?: ClerkGlobal }).Clerk;
  if (!clerk?.session) return null;
  try {
    return await clerk.session.getToken();
  } catch {
    return null;
  }
}

/**
 * Headers extras exigidos pelo transporte, nao pela aplicacao.
 *
 * O ngrok gratuito intercepta requisicoes com User-Agent de navegador e
 * devolve uma pagina HTML de aviso no lugar da resposta real — o que
 * quebraria toda chamada de API. Este header pula a interstitial. E inofensivo
 * fora do ngrok: qualquer outro servidor simplesmente ignora.
 */
export const transportHeaders: Record<string, string> = isCrossOrigin
  ? { "ngrok-skip-browser-warning": "true" }
  : {};

/** Headers de autenticacao e transporte a acrescentar em cada request. */
export async function authHeaders(): Promise<Record<string, string>> {
  const token = await getSessionToken();
  return {
    ...transportHeaders,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
