/**
 * Admin sections for the Settings page:
 * - TeamSection: tenant users with role, status, access type (continuous /
 *   temporary with expiry), invite, revoke and renew actions.
 * - DepartmentsSection: departments ("setores") as hotel rooms — name, color,
 *   capacity (max agents), current occupancy, and per-department agent
 *   management.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users as UsersIcon,
  Plus,
  Loader2,
  Trash2,
  Clock,
  Infinity as InfinityIcon,
  ShieldOff,
  ShieldCheck,
  DoorOpen,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  listTenantUsers,
  inviteTenantUser,
  patchTenantUser,
  removeTenantUser,
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  listDepartmentAgents,
  addDepartmentAgent,
  removeDepartmentAgent,
  type TenantUserRow,
  type DepartmentRow,
} from "@/lib/api";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  supervisor: "Supervisor",
  agent: "Agente",
};

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  active: { label: "Ativo", cls: "bg-green-100 text-green-700" },
  invited: { label: "Convidado", cls: "bg-blue-100 text-blue-700" },
  suspended: { label: "Suspenso", cls: "bg-red-100 text-red-700" },
};

function displayName(u: { firstName: string | null; lastName: string | null; email: string }) {
  return u.firstName ? `${u.firstName} ${u.lastName ?? ""}`.trim() : u.email;
}

function accessInfo(u: TenantUserRow): { label: string; expired: boolean } {
  if (!u.accessExpiresAt) return { label: "Contínuo", expired: false };
  const d = new Date(u.accessExpiresAt);
  const expired = d.getTime() <= Date.now();
  return {
    label: `${expired ? "Expirou em" : "Até"} ${d.toLocaleDateString("pt-BR")}`,
    expired,
  };
}

function isUsableActiveAdmin(u: TenantUserRow): boolean {
  return (
    u.role === "admin" &&
    u.status === "active" &&
    (!u.accessExpiresAt || new Date(u.accessExpiresAt).getTime() > Date.now())
  );
}

/** datetime-local value (local time) → ISO string with offset */
function toIso(local: string): string | null {
  if (!local) return null;
  return new Date(local).toISOString();
}

// ---------------------------------------------------------------------------
// Team section
// ---------------------------------------------------------------------------

export function TeamSection({ tenantId, myUserId }: { tenantId: number; myUserId: string | undefined }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const invalidate = () => void qc.invalidateQueries({ queryKey: ["team-users", tenantId] });

  const { data: users, isLoading } = useQuery({
    queryKey: ["team-users", tenantId],
    queryFn: () => listTenantUsers(tenantId),
  });

  const patchM = useMutation({
    mutationFn: (args: { userId: string; body: Parameters<typeof patchTenantUser>[2] }) =>
      patchTenantUser(tenantId, args.userId, args.body),
    onSuccess: invalidate,
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
  const removeM = useMutation({
    mutationFn: (userId: string) => removeTenantUser(tenantId, userId),
    onSuccess: () => {
      invalidate();
      toast({ title: "Usuário removido" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const [expiryFor, setExpiryFor] = useState<string | null>(null);
  const [expiryValue, setExpiryValue] = useState("");
  const activeAdminCount = users?.filter(isUsableActiveAdmin).length ?? 0;
  const callerIsSuperAdmin =
    users?.some((u) => u.clerkUserId === myUserId && u.isSuperAdmin) ?? false;

  function confirmAdminAccessChange(
    user: TenantUserRow,
    action: "suspender" | "remover",
  ): boolean {
    if (!isUsableActiveAdmin(user)) {
      return true;
    }

    if (activeAdminCount === 1 && !callerIsSuperAdmin) {
      return window.confirm(
        `Atenção: ${displayName(user)} é o último admin ativo. ` +
          `A central precisa manter pelo menos um admin para gerenciar a equipe e os setores. ` +
          `A tentativa de ${action} será bloqueada. Deseja continuar?`,
      );
    }

    return window.confirm(
      `Atenção: você está prestes a ${action} ${displayName(user)}, que é um admin ativo. ` +
        "Confirme para continuar.",
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="w-4 h-4 text-[#25D366]" /> Equipe
            </CardTitle>
            <CardDescription>
              Convide usuários, defina acesso contínuo ou temporário e revogue quando precisar.
            </CardDescription>
          </div>
          <InviteDialog tenantId={tenantId} onDone={invalidate} />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-[#25D366]" /></div>
        ) : !users?.length ? (
          <p className="text-sm text-gray-500 py-4">Nenhum usuário ainda. Convide o primeiro.</p>
        ) : (
          <div className="divide-y">
            {users.map((u) => {
              const acc = accessInfo(u);
              const isSelf = u.clerkUserId === myUserId;
              return (
                <div key={u.clerkUserId} className="py-3 flex items-center gap-3">
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={u.avatarUrl ?? undefined} />
                    <AvatarFallback>{displayName(u).slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {displayName(u)}
                      {isSelf && <span className="text-xs text-gray-400"> (você)</span>}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {u.email}
                      {u.departments.length > 0 && ` · ${u.departments.join(", ")}`}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">{ROLE_LABEL[u.role] ?? u.role}</Badge>
                  <Badge className={`text-xs border-none ${STATUS_LABEL[u.status]?.cls ?? ""}`}>
                    {STATUS_LABEL[u.status]?.label ?? u.status}
                  </Badge>
                  <span
                    className={`text-xs flex items-center gap-1 w-36 ${acc.expired ? "text-red-600 font-medium" : "text-gray-500"}`}
                    title="Tipo de acesso"
                  >
                    {u.accessExpiresAt ? <Clock className="w-3 h-3" /> : <InfinityIcon className="w-3 h-3" />}
                    {acc.label}
                  </span>
                  {!isSelf && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        title="Definir validade do acesso"
                        onClick={() => {
                          setExpiryFor(expiryFor === u.clerkUserId ? null : u.clerkUserId);
                          setExpiryValue("");
                        }}
                      >
                        <Clock className="w-3.5 h-3.5" />
                      </Button>
                      {u.status === "suspended" ? (
                        <Button
                          variant="ghost" size="sm" className="h-7 px-2 text-xs text-green-700"
                          title="Reativar acesso"
                          onClick={() => patchM.mutate({ userId: u.clerkUserId, body: { status: "active" } })}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost" size="sm" className="h-7 px-2 text-xs text-amber-700"
                          title="Revogar acesso (suspender)"
                          onClick={() => {
                            if (confirmAdminAccessChange(u, "suspender")) {
                              patchM.mutate({ userId: u.clerkUserId, body: { status: "suspended" } });
                            }
                          }}
                        >
                          <ShieldOff className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost" size="sm" className="h-7 px-2 text-xs text-red-600"
                        title="Remover da central"
                        onClick={() => {
                          const confirmed = isUsableActiveAdmin(u)
                            ? confirmAdminAccessChange(u, "remover")
                            : confirm(`Remover ${displayName(u)} da central?`);

                          if (confirmed) {
                            removeM.mutate(u.clerkUserId);
                          }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                  {expiryFor === u.clerkUserId && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="datetime-local"
                        className="h-8 text-xs w-48"
                        value={expiryValue}
                        onChange={(e) => setExpiryValue(e.target.value)}
                      />
                      <Button
                        size="sm" className="h-8 text-xs bg-[#25D366] hover:bg-[#1ebe57] text-white"
                        disabled={!expiryValue || patchM.isPending}
                        onClick={() => {
                          patchM.mutate(
                            { userId: u.clerkUserId, body: { accessExpiresAt: toIso(expiryValue) } },
                            { onSuccess: () => setExpiryFor(null) },
                          );
                        }}
                      >
                        Definir
                      </Button>
                      {u.accessExpiresAt && (
                        <Button
                          size="sm" variant="outline" className="h-8 text-xs"
                          onClick={() => {
                            patchM.mutate(
                              { userId: u.clerkUserId, body: { accessExpiresAt: null } },
                              { onSuccess: () => setExpiryFor(null) },
                            );
                          }}
                        >
                          Tornar contínuo
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InviteDialog({ tenantId, onDone }: { tenantId: number; onDone: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TenantUserRow["role"]>("agent");
  const [temporary, setTemporary] = useState(false);
  const [expiry, setExpiry] = useState("");

  const inviteM = useMutation({
    mutationFn: () =>
      inviteTenantUser(tenantId, {
        email: email.trim(),
        role,
        accessExpiresAt: temporary ? toIso(expiry) : null,
      }),
    onSuccess: () => {
      toast({ title: "Convite enviado!" });
      setOpen(false);
      setEmail(""); setRole("agent"); setTemporary(false); setExpiry("");
      onDone();
    },
    onError: (e: Error) => toast({ title: "Erro ao convidar", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#25D366] hover:bg-[#1ebe57] text-white gap-2" size="sm">
          <Plus className="w-4 h-4" /> Convidar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Convidar usuário</DialogTitle></DialogHeader>
        <form
          className="space-y-4 py-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!email.trim()) return;
            if (temporary && !expiry) {
              toast({ title: "Informe a data de expiração", variant: "destructive" });
              return;
            }
            inviteM.mutate();
          }}
        >
          <div className="space-y-2">
            <label className="text-sm font-medium">E-mail</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pessoa@empresa.com" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Papel</label>
            <select
              className="w-full border rounded-md h-9 px-2 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value as TenantUserRow["role"])}
            >
              <option value="agent">Agente</option>
              <option value="supervisor">Supervisor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <input type="checkbox" checked={temporary} onChange={(e) => setTemporary(e.target.checked)} />
              Acesso temporário (expira automaticamente)
            </label>
            {temporary && (
              <Input type="datetime-local" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" className="bg-[#25D366] hover:bg-[#1ebe57] text-white" disabled={inviteM.isPending}>
              {inviteM.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enviar convite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Departments ("setores") section
// ---------------------------------------------------------------------------

export function DepartmentsSection({ tenantId }: { tenantId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const invalidate = () => void qc.invalidateQueries({ queryKey: ["departments", tenantId] });

  const { data: departments, isLoading } = useQuery({
    queryKey: ["departments", tenantId],
    queryFn: () => listDepartments(tenantId),
  });

  const createM = useMutation({
    mutationFn: (body: { name: string; maxAgents: number | null }) => createDepartment(tenantId, body),
    onSuccess: () => { invalidate(); toast({ title: "Setor criado!" }); },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const [newName, setNewName] = useState("");
  const [newMax, setNewMax] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DoorOpen className="w-4 h-4 text-[#25D366]" /> Setores (ramais)
        </CardTitle>
        <CardDescription>
          Cada setor funciona como um quarto de hotel: tem nome e lotação máxima de agentes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newName.trim()) return;
            createM.mutate(
              { name: newName.trim(), maxAgents: newMax ? Number(newMax) : null },
              { onSuccess: () => { setNewName(""); setNewMax(""); } },
            );
          }}
        >
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome do setor (ex: Financeiro)" className="flex-1" />
          <Input value={newMax} onChange={(e) => setNewMax(e.target.value.replace(/\D/g, ""))} placeholder="Lotação máx." className="w-32" />
          <Button type="submit" className="bg-[#25D366] hover:bg-[#1ebe57] text-white" disabled={createM.isPending}>
            <Plus className="w-4 h-4" />
          </Button>
        </form>

        {isLoading ? (
          <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-[#25D366]" /></div>
        ) : !departments?.length ? (
          <p className="text-sm text-gray-500">Nenhum setor criado ainda.</p>
        ) : (
          <div className="space-y-3">
            {departments.map((d) => (
              <DepartmentCard key={d.id} tenantId={tenantId} dept={d} onChanged={invalidate} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DepartmentCard({ tenantId, dept, onChanged }: { tenantId: number; dept: DepartmentRow; onChanged: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [maxEdit, setMaxEdit] = useState(dept.maxAgents?.toString() ?? "");

  const full = dept.maxAgents !== null && dept.agentCount >= dept.maxAgents;

  const invalidateAgents = () => {
    void qc.invalidateQueries({ queryKey: ["dept-agents", tenantId, dept.id] });
    onChanged();
  };

  const { data: agents } = useQuery({
    queryKey: ["dept-agents", tenantId, dept.id],
    queryFn: () => listDepartmentAgents(tenantId, dept.id),
    enabled: expanded,
  });
  const { data: users } = useQuery({
    queryKey: ["team-users", tenantId],
    queryFn: () => listTenantUsers(tenantId),
    enabled: expanded,
  });

  const updateM = useMutation({
    mutationFn: (body: Parameters<typeof updateDepartment>[2]) => updateDepartment(tenantId, dept.id, body),
    onSuccess: onChanged,
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
  const deleteM = useMutation({
    mutationFn: () => deleteDepartment(tenantId, dept.id),
    onSuccess: () => { onChanged(); toast({ title: "Setor removido" }); },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
  const addAgentM = useMutation({
    mutationFn: (clerkUserId: string) => addDepartmentAgent(tenantId, dept.id, { clerkUserId }),
    onSuccess: invalidateAgents,
    onError: (e: Error) => toast({ title: "Não foi possível adicionar", description: e.message, variant: "destructive" }),
  });
  const removeAgentM = useMutation({
    mutationFn: (userId: string) => removeDepartmentAgent(tenantId, dept.id, userId),
    onSuccess: invalidateAgents,
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const memberIds = new Set(agents?.map((a) => a.clerkUserId) ?? []);
  const candidates = (users ?? []).filter((u) => u.status === "active" && !memberIds.has(u.clerkUserId));

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center gap-3">
        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: dept.color }} />
        <button className="flex-1 text-left" onClick={() => setExpanded(!expanded)}>
          <span className="font-medium text-gray-900">{dept.name}</span>
          {dept.status === "inactive" && (
            <Badge variant="outline" className="ml-2 text-xs">Inativo</Badge>
          )}
        </button>
        <Badge className={`border-none text-xs ${full ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
          {dept.agentCount}{dept.maxAgents !== null ? ` / ${dept.maxAgents}` : ""}
          {dept.maxAgents === null && dept.agentCount === 1 ? " agente" : " agentes"}
          {full && " · lotado"}
        </Badge>
        <Button
          variant="ghost" size="sm" className="h-7 px-2 text-red-600"
          title="Excluir setor"
          onClick={() => { if (confirm(`Excluir o setor ${dept.name}?`)) deleteM.mutate(); }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-4 pl-6">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">Lotação máxima:</label>
            <Input
              className="h-8 w-24 text-xs"
              value={maxEdit}
              onChange={(e) => setMaxEdit(e.target.value.replace(/\D/g, ""))}
              placeholder="Ilimitada"
            />
            <Button
              size="sm" variant="outline" className="h-8 text-xs"
              disabled={updateM.isPending}
              onClick={() => updateM.mutate({ maxAgents: maxEdit ? Number(maxEdit) : null })}
            >
              Salvar
            </Button>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">Agentes neste setor</p>
            {!agents?.length ? (
              <p className="text-xs text-gray-400">Nenhum agente ainda.</p>
            ) : (
              <div className="space-y-1">
                {agents.map((a) => (
                  <div key={a.clerkUserId} className="flex items-center gap-2 text-sm">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={a.avatarUrl ?? undefined} />
                      <AvatarFallback className="text-[10px]">{displayName(a).slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate">{displayName(a)}</span>
                    <Button
                      variant="ghost" size="sm" className="h-6 px-1.5 text-red-600"
                      title="Remover do setor"
                      onClick={() => removeAgentM.mutate(a.clerkUserId)}
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {candidates.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">Adicionar agente</p>
              <div className="flex flex-wrap gap-2">
                {candidates.map((u) => (
                  <Button
                    key={u.clerkUserId}
                    variant="outline" size="sm" className="h-7 text-xs gap-1"
                    disabled={addAgentM.isPending || full}
                    title={full ? "Setor lotado" : undefined}
                    onClick={() => addAgentM.mutate(u.clerkUserId)}
                  >
                    <UserPlus className="w-3 h-3" /> {displayName(u)}
                  </Button>
                ))}
              </div>
              {full && (
                <p className="text-xs text-red-600 mt-1">Setor lotado — aumente a lotação máxima para adicionar mais agentes.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
