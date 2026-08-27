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
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  Dialog,
  IconButton,
  Input,
  Select,
} from "@healthventureslm/design-system";
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

const STATUS_LABEL: Record<string, { label: string; variant: "positive" | "info" | "danger" }> = {
  active: { label: "Ativo", variant: "positive" },
  invited: { label: "Convidado", variant: "info" },
  suspended: { label: "Suspenso", variant: "danger" },
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
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <UsersIcon className="w-4 h-4 text-primary" /> Equipe
          </span>
        }
        subtitle="Convide usuários, defina acesso contínuo ou temporário e revogue quando precisar."
        action={<InviteDialog tenantId={tenantId} onDone={invalidate} />}
      />
      <CardBody>
        {isLoading ? (
          <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : !users?.length ? (
          <p className="text-sm text-muted-foreground py-4">Nenhum usuário ainda. Convide o primeiro.</p>
        ) : (
          <div className="divide-y">
            {users.map((u) => {
              const acc = accessInfo(u);
              const isSelf = u.clerkUserId === myUserId;
              return (
                <div key={u.clerkUserId} className="py-3 flex items-center gap-3">
                  <Avatar size="sm" src={u.avatarUrl ?? undefined} fromName={displayName(u)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {displayName(u)}
                      {isSelf && <span className="text-xs text-muted-foreground"> (você)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {u.email}
                      {u.departments.length > 0 && ` · ${u.departments.join(", ")}`}
                    </p>
                  </div>
                  <Badge outline>{ROLE_LABEL[u.role] ?? u.role}</Badge>
                  <Badge variant={STATUS_LABEL[u.status]?.variant ?? "neutral"}>
                    {STATUS_LABEL[u.status]?.label ?? u.status}
                  </Badge>
                  <span
                    className={`text-xs flex items-center gap-1 w-36 ${acc.expired ? "text-red-600 font-medium" : "text-muted-foreground"}`}
                    title="Tipo de acesso"
                  >
                    {u.accessExpiresAt ? <Clock className="w-3 h-3" /> : <InfinityIcon className="w-3 h-3" />}
                    {acc.label}
                  </span>
                  {!isSelf && (
                    <div className="flex items-center gap-1">
                      <IconButton
                        size="sm"
                        label="Definir validade do acesso"
                        onClick={() => {
                          setExpiryFor(expiryFor === u.clerkUserId ? null : u.clerkUserId);
                          setExpiryValue("");
                        }}
                      >
                        <Clock className="w-3.5 h-3.5" />
                      </IconButton>
                      {u.status === "suspended" ? (
                        <IconButton
                          size="sm"
                          label="Reativar acesso"
                          onClick={() => patchM.mutate({ userId: u.clerkUserId, body: { status: "active" } })}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </IconButton>
                      ) : (
                        <IconButton
                          size="sm"
                          label="Revogar acesso (suspender)"
                          onClick={() => {
                            if (confirmAdminAccessChange(u, "suspender")) {
                              patchM.mutate({ userId: u.clerkUserId, body: { status: "suspended" } });
                            }
                          }}
                        >
                          <ShieldOff className="w-3.5 h-3.5" />
                        </IconButton>
                      )}
                      <IconButton
                        size="sm"
                        className="text-[var(--coral-600)]"
                        label="Remover da central"
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
                      </IconButton>
                    </div>
                  )}
                  {expiryFor === u.clerkUserId && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="datetime-local"
                        className="w-48"
                        value={expiryValue}
                        onChange={(e) => setExpiryValue(e.target.value)}
                      />
                      <Button
                        size="sm"
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
                          size="sm" variant="secondary"
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
      </CardBody>
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

  /*
   * O Dialog do design system nao tem gatilho nem rodape dentro do conteudo:
   * a visibilidade vem de `open` e o rodape e uma prop. Como os botoes ficam
   * fora do <form>, o de enviar aponta para ele pelo atributo `form`.
   */
  const idForm = "convidar-usuario";

  return (
    <>
      <Button size="sm" iconLeft={<Plus className="w-4 h-4" />} onClick={() => setOpen(true)}>
        Convidar
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Convidar usuário"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form={idForm} loading={inviteM.isPending}>
              Enviar convite
            </Button>
          </>
        }
      >
        <form
          id={idForm}
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
          <Input
            label="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="pessoa@empresa.com"
            required
          />
          <Select
            label="Papel"
            value={role}
            onChange={(v) => setRole(v as TenantUserRow["role"])}
            options={[
              { value: "agent", label: "Agente" },
              { value: "supervisor", label: "Supervisor" },
              { value: "admin", label: "Admin" },
            ]}
          />
          <div className="space-y-2">
            <Checkbox
              label="Acesso temporário (expira automaticamente)"
              checked={temporary}
              onChange={(e) => setTemporary(e.target.checked)}
            />
            {temporary && (
              <Input type="datetime-local" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
            )}
          </div>
        </form>
      </Dialog>
    </>
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
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <DoorOpen className="w-4 h-4 text-primary" /> Setores (ramais)
          </span>
        }
        subtitle="Cada setor funciona como um quarto de hotel: tem nome e lotação máxima de agentes."
      />
      <CardBody className="space-y-4">
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
          <Button type="submit" loading={createM.isPending} iconLeft={<Plus className="w-4 h-4" />}>
            Criar
          </Button>
        </form>

        {isLoading ? (
          <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : !departments?.length ? (
          <p className="text-sm text-muted-foreground">Nenhum setor criado ainda.</p>
        ) : (
          <div className="space-y-3">
            {departments.map((d) => (
              <DepartmentCard key={d.id} tenantId={tenantId} dept={d} onChanged={invalidate} />
            ))}
          </div>
        )}
      </CardBody>
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
          <span className="font-medium text-foreground">{dept.name}</span>
          {dept.status === "inactive" && (
            <Badge outline className="ml-2">Inativo</Badge>
          )}
        </button>
        <Badge variant={full ? "danger" : "neutral"}>
          {dept.agentCount}{dept.maxAgents !== null ? ` / ${dept.maxAgents}` : ""}
          {dept.maxAgents === null && dept.agentCount === 1 ? " agente" : " agentes"}
          {full && " · lotado"}
        </Badge>
        <IconButton
          size="sm"
          className="text-[var(--coral-600)]"
          label="Excluir setor"
          onClick={() => { if (confirm(`Excluir o setor ${dept.name}?`)) deleteM.mutate(); }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </IconButton>
      </div>

      {expanded && (
        <div className="mt-4 space-y-4 pl-6">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Lotação máxima:</label>
            <Input
              className="w-28"
              value={maxEdit}
              onChange={(e) => setMaxEdit(e.target.value.replace(/\D/g, ""))}
              placeholder="Ilimitada"
            />
            <Button
              size="sm" variant="secondary"
              loading={updateM.isPending}
              onClick={() => updateM.mutate({ maxAgents: maxEdit ? Number(maxEdit) : null })}
            >
              Salvar
            </Button>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Agentes neste setor</p>
            {!agents?.length ? (
              <p className="text-xs text-muted-foreground">Nenhum agente ainda.</p>
            ) : (
              <div className="space-y-1">
                {agents.map((a) => (
                  <div key={a.clerkUserId} className="flex items-center gap-2 text-sm">
                    <Avatar size="xs" src={a.avatarUrl ?? undefined} fromName={displayName(a)} />
                    <span className="flex-1 truncate">{displayName(a)}</span>
                    <IconButton
                      size="sm"
                      className="text-[var(--coral-600)]"
                      label="Remover do setor"
                      onClick={() => removeAgentM.mutate(a.clerkUserId)}
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                    </IconButton>
                  </div>
                ))}
              </div>
            )}
          </div>

          {candidates.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Adicionar agente</p>
              <div className="flex flex-wrap gap-2">
                {candidates.map((u) => (
                  <Button
                    key={u.clerkUserId}
                    variant="secondary" size="sm"
                    iconLeft={<UserPlus className="w-3 h-3" />}
                    disabled={addAgentM.isPending || full}
                    title={full ? "Setor lotado" : undefined}
                    onClick={() => addAgentM.mutate(u.clerkUserId)}
                  >
                    {displayName(u)}
                  </Button>
                ))}
              </div>
              {full && (
                <p className="text-xs text-[var(--coral-600)] mt-1">Setor lotado — aumente a lotação máxima para adicionar mais agentes.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
