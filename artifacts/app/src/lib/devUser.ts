/**
 * Identidade local do bypass de desenvolvimento.
 *
 * Modulo deliberadamente sem dependencias: tanto `apiBase.ts` quanto
 * `devAuth.tsx` precisam dele, e um import circular entre os dois quebraria a
 * inicializacao.
 *
 * A identidade fica em localStorage e viaja no header `x-dev-user`. O id
 * carrega email e nome codificados, para o servidor reconstruir o perfil sem
 * precisar de cadastro previo — ver `api-server/src/lib/devAuth.ts`.
 */

/** true quando o bypass esta ativo neste build do frontend. */
export const DEV_AUTH_BYPASS =
  import.meta.env.VITE_DEV_AUTH_BYPASS === "1";

const STORAGE_KEY = "zapcentral_dev_user";

export interface DevUser {
  id: string;
  email: string;
  name: string;
}

/** base64url sem padding — o mesmo formato que o Buffer do Node produz. */
function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Deriva o id estavel a partir de email e nome. */
export function makeDevUserId(email: string, name: string): string {
  return `dev_${toBase64Url(`${email}|${name}`)}`;
}

/** Usuario logado no bypass, ou null. */
export function getDevUser(): DevUser | null {
  if (!DEV_AUTH_BYPASS) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DevUser>;
    if (!parsed.id || !parsed.email) return null;
    return { id: parsed.id, email: parsed.email, name: parsed.name ?? "" };
  } catch {
    return null;
  }
}

/** Entra como a identidade informada e recarrega para reidratar as queries. */
export function signInDevUser(email: string, name: string): DevUser {
  const user: DevUser = { id: makeDevUserId(email, name), email, name };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  // O cookie cobre o handshake do Socket.io em polling, que nao carrega
  // headers customizados.
  document.cookie = `dev_user=${encodeURIComponent(user.id)}; path=/; SameSite=Lax`;
  return user;
}

export function signOutDevUser(): void {
  localStorage.removeItem(STORAGE_KEY);
  document.cookie = "dev_user=; path=/; Max-Age=0; SameSite=Lax";
}

/** Header de identidade a acrescentar em cada request no modo bypass. */
export function devAuthHeaders(): Record<string, string> {
  const user = getDevUser();
  return user ? { "x-dev-user": user.id } : {};
}
