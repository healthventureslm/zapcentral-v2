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

  const active = data?.find((t) => t.status === "active");
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

  const active = data?.find((t) => t.status === "active");
  return active?.role ?? null;
}
