/**
 * Provides the current tenant ID from the user's tenant memberships.
 * For now returns the first active tenant.
 */
import { useQuery } from "@tanstack/react-query";
import { API_BASE, authHeaders } from "@/lib/apiBase";

interface TenantItem {
  tenantId: number;
  tenantName: string;
  tenantSlug: string;
  role: string;
  status: string;
}

/**
 * A central operacional do usuario.
 *
 * O tenant `system` e interno — existe so para hospedar o super admin da
 * plataforma e nunca deve ser o alvo de configuracao (bot, convites,
 * contatos). O TenantGuard em App.tsx aplica a mesma exclusao ao decidir se
 * ha acesso; se as duas regras divergirem, a interface opera numa central e
 * afirma estar em outra.
 */
function activeOperationalTenant(
  tenants: TenantItem[] | undefined,
): TenantItem | undefined {
  return tenants?.find(
    (t) => t.status === "active" && t.tenantSlug !== "system",
  );
}

export function useTenantId(): number | null {
  const { data } = useQuery({
    queryKey: ["me-tenants"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/me/tenants`, {
        credentials: "include",
        headers: await authHeaders(),
      });
      if (!res.ok) return [];
      return res.json() as Promise<TenantItem[]>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const active = activeOperationalTenant(data);
  return active?.tenantId ?? null;
}

/** Role of the current user in the active tenant (null while loading). */
export function useMyRole(): string | null {
  const { data } = useQuery({
    queryKey: ["me-tenants"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/me/tenants`, {
        credentials: "include",
        headers: await authHeaders(),
      });
      if (!res.ok) return [];
      return res.json() as Promise<TenantItem[]>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const active = activeOperationalTenant(data);
  return active?.role ?? null;
}
