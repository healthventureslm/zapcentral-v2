import { useState } from "react";
import { Link } from "wouter";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  Dialog,
  Menu,
  Input,
  Select,
} from "@healthventureslm/design-system";
import { PageShell } from "@/components/PageShell";
import { CrmTabs } from "@/components/crm/crm-tabs";
import { useCrmHooks, useContacts } from "@/hooks/use-crm";
import {
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  Upload,
  Download,
  Tags,
  Users as UsersIcon,
  Loader2,
  Phone,
  Mail,
  Building2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isValidCpf } from "@/lib/cpf";
import { contactsExportUrl } from "@/lib/api";

function ManageTagsDialog() {
  const [open, setOpen] = useState(false);
  const { tags, createTag, deleteTag } = useCrmHooks();
  const { toast } = useToast();
  const [newTag, setNewTag] = useState({ name: "", color: "#25D366" });

  const handleAdd = () => {
    if (!newTag.name) return;
    createTag.mutate(newTag, {
      onSuccess: () => {
        setNewTag({ name: "", color: "#25D366" });
        toast({ title: "Tag adicionada" });
      }
    });
  };

  return (
    /* O Dialog do design system nao tem gatilho embutido: e controlado por
       `open` e `onClose`, entao o botao que abre vive fora dele. */
    <>
      <Button
        variant="secondary"
        iconLeft={<Tags className="w-4 h-4" />}
        onClick={() => setOpen(true)}
      >
        Etiquetas
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Gerenciar etiquetas"
      >
        <div className="space-y-4">
          <ul className="space-y-2 max-h-60 overflow-y-auto">
            {tags.data?.map((tag) => (
              <li
                key={tag.id}
                className="flex items-center justify-between p-2 border border-[var(--border-subtle)] rounded-md"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: tag.color || "var(--border-strong)" }}
                  />
                  <span className="text-sm font-medium">{tag.name}</span>
                </div>
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={() => {
                    if (confirm("Excluir etiqueta?")) {
                      deleteTag.mutate(tag.id, {
                        onSuccess: () => toast({ title: "Etiqueta excluída" }),
                      });
                    }
                  }}
                >
                  Excluir
                </Button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2 items-end pt-4 border-t border-[var(--border-subtle)]">
            <input
              type="color"
              aria-label="Cor da etiqueta"
              value={newTag.color}
              onChange={(e) => setNewTag({ ...newTag, color: e.target.value })}
              className="w-9 h-9 p-0 border-0 rounded cursor-pointer shrink-0"
            />
            <Input
              placeholder="Nova etiqueta…"
              value={newTag.name}
              onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Button
              variant="primary"
              loading={createTag.isPending}
              disabled={!newTag.name}
              onClick={handleAdd}
            >
              Adicionar
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

function ManageCustomFieldsDialog() {
  const [open, setOpen] = useState(false);
  const { customFields, createCustomField, deleteCustomField } = useCrmHooks();
  const { toast } = useToast();
  
  const [newField, setNewField] = useState<{name: string, type: "text"|"number"|"date"|"select", options: string}>({ name: "", type: "text", options: "" });

  const handleAdd = () => {
    if (!newField.name) return;
    const opts = newField.type === "select" ? newField.options.split(",").map(s => s.trim()).filter(Boolean) : undefined;
    createCustomField.mutate({
      name: newField.name,
      type: newField.type,
      options: opts,
      position: (customFields.data?.length || 0) + 1
    }, {
      onSuccess: () => {
        setNewField({ name: "", type: "text", options: "" });
        toast({ title: "Campo adicionado" });
      }
    });
  };

  return (
    <>
      <Button
        variant="secondary"
        className="hidden md:inline-flex"
        iconLeft={<MoreHorizontal className="w-4 h-4" />}
        onClick={() => setOpen(true)}
      >
        Campos personalizados
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Campos personalizados"
      >
        <div className="space-y-4">
          <ul className="space-y-2 max-h-60 overflow-y-auto">
            {customFields.data?.map((field) => (
              <li
                key={field.id}
                className="flex items-center justify-between p-2 border border-[var(--border-subtle)] rounded-md"
              >
                <div>
                  <span className="text-sm font-medium">{field.name}</span>
                  <span className="text-xs text-[var(--text-muted)] ml-2">
                    ({field.type})
                  </span>
                </div>
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={() => {
                    if (confirm("Excluir campo?")) {
                      deleteCustomField.mutate(field.id, {
                        onSuccess: () => toast({ title: "Campo excluído" }),
                      });
                    }
                  }}
                >
                  Excluir
                </Button>
              </li>
            ))}
          </ul>
          <div className="space-y-3 pt-4 border-t">
            <Input 
              placeholder="Nome do campo..." 
              value={newField.name} 
              onChange={e => setNewField({...newField, name: e.target.value})} 
            />
            <div className="flex gap-2">
              <Select
                className="w-32"
                value={newField.type}
                onChange={(v) => setNewField({ ...newField, type: v as typeof newField.type })}
                options={[
                  { value: "text", label: "Texto" },
                  { value: "number", label: "Número" },
                  { value: "date", label: "Data" },
                  { value: "select", label: "Lista" },
                ]}
              />
              {newField.type === 'select' && (
                <Input 
                  placeholder="Opções (separadas por vírgula)" 
                  value={newField.options} 
                  onChange={e => setNewField({...newField, options: e.target.value})} 
                  className="flex-1"
                />
              )}
            </div>
            <Button
              variant="primary"
              block
              loading={createCustomField.isPending}
              disabled={!newField.name}
              onClick={handleAdd}
            >
              Adicionar campo
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

export default function ContactsPage() {
  const [q, setQ] = useState("");
  const [tagId, setTagId] = useState<number | undefined>();
  const [assignedTo, setAssignedTo] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const limit = 20;

  const { tenantId, tags, agents } = useCrmHooks();
  const { query, bulkContacts, mergeContacts } = useContacts({
    q: q || undefined,
    tagId,
    assignedTo: assignedTo === "unassigned" ? "" : assignedTo,
    page,
    limit,
  });

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const toggleSelectAll = () => {
    if (!query.data) return;
    if (selectedIds.size === query.data.contacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(query.data.contacts.map((c) => c.id)));
    }
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkAssign = (agentId: string) => {
    if (selectedIds.size === 0) return;
    bulkContacts.mutate(
      { contactIds: Array.from(selectedIds), assignedTo: agentId === "unassigned" ? null : agentId },
      {
        onSuccess: () => {
          toast({ title: "Contatos atualizados" });
          setSelectedIds(new Set());
        },
      }
    );
  };

  const handleBulkTag = (addTagId: number) => {
    if (selectedIds.size === 0) return;
    bulkContacts.mutate(
      { contactIds: Array.from(selectedIds), addTagId },
      {
        onSuccess: () => {
          toast({ title: "Tags adicionadas aos contatos" });
          setSelectedIds(new Set());
        },
      }
    );
  };

  return (
    <PageShell
        title="CRM"
        actions={
          <div className="flex items-center gap-3">
              <ManageTagsDialog />
              <ManageCustomFieldsDialog />
              <CreateContactDialog />
              <ImportCsvDialog />
              {tenantId && (
                <a
                  href={contactsExportUrl(tenantId)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground bg-muted border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Exportar
                </a>
              )}
          </div>
        }
      >
        <CrmTabs />
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar por nome, telefone ou email..."
                className="pl-9"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <Select
              className="w-[200px]"
              placeholder="Filtrar por etiqueta"
              value={tagId ? String(tagId) : "all"}
              onChange={(v) => {
                setTagId(v === "all" ? undefined : Number(v));
                setPage(1);
              }}
              options={[
                { value: "all", label: "Todas as etiquetas" },
                ...(tags.data ?? []).map((et) => ({
                  value: String(et.id),
                  label: et.name,
                })),
              ]}
            />

            <Select
              className="w-[200px]"
              placeholder="Responsável"
              value={assignedTo || "all"}
              onChange={(v) => {
                setAssignedTo(v === "all" ? undefined : v);
                setPage(1);
              }}
              options={[
                { value: "all", label: "Qualquer responsável" },
                { value: "unassigned", label: "Sem responsável" },
                ...(agents.data ?? []).map((a) => ({
                  value: a.clerkUserId,
                  label: a.firstName
                    ? `${a.firstName} ${a.lastName || ""}`.trim()
                    : a.email,
                })),
              ]}
            />
          </div>

          {/* Bulk Actions */}
          {selectedIds.size > 0 && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-6 flex items-center justify-between animate-in fade-in slide-in-from-top-4">
              <span className="text-sm font-medium text-primary">
                {selectedIds.size} contato(s) selecionado(s)
              </span>
              <div className="flex items-center gap-2">
                {selectedIds.size === 2 && (
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="bg-card border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
                    onClick={() => {
                      const ids = Array.from(selectedIds);
                      if (confirm("Deseja mesclar estes dois contatos? O primeiro selecionado será mantido como primário.")) {
                        mergeContacts.mutate(
                          { primaryId: ids[0], duplicateId: ids[1] },
                          {
                            onSuccess: () => {
                              toast({ title: "Contatos mesclados com sucesso!" });
                              setSelectedIds(new Set());
                            }
                          }
                        );
                      }
                    }}
                  >
                    <UsersIcon className="w-4 h-4 mr-2" />
                    Mesclar
                  </Button>
                )}
                <Menu
                  align="end"
                  trigger={
                    <Button variant="secondary" size="sm" iconLeft={<Tags className="w-4 h-4" />}>
                      Adicionar etiqueta
                    </Button>
                  }
                  items={(tags.data ?? []).map((et) => ({
                    id: String(et.id),
                    label: et.name,
                    onSelect: () => handleBulkTag(et.id),
                  }))}
                />

                <Menu
                  align="end"
                  trigger={
                    <Button variant="secondary" size="sm" iconLeft={<UsersIcon className="w-4 h-4" />}>
                      Atribuir responsável
                    </Button>
                  }
                  items={[
                    {
                      id: "unassigned",
                      label: "Sem responsável",
                      onSelect: () => handleBulkAssign("unassigned"),
                    },
                    ...(agents.data ?? []).map((a) => ({
                      id: a.clerkUserId,
                      label: a.firstName
                        ? `${a.firstName} ${a.lastName || ""}`.trim()
                        : a.email,
                      onSelect: () => handleBulkAssign(a.clerkUserId),
                    })),
                  ]}
                />
              </div>
            </div>
          )}

          <Card className="shadow-sm border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted border-b border-border text-muted-foreground font-medium">
                  <tr>
                    <th className="px-6 py-4 w-12">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                        checked={
                          query.data?.contacts.length! > 0 &&
                          selectedIds.size === query.data?.contacts.length
                        }
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th className="px-6 py-4">Nome / Empresa</th>
                    <th className="px-6 py-4">Contato</th>
                    <th className="px-6 py-4">Tags</th>
                    <th className="px-6 py-4">Responsável</th>
                    <th className="px-6 py-4 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {query.isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                        <span className="text-muted-foreground">Carregando contatos...</span>
                      </td>
                    </tr>
                  ) : query.data?.contacts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                          <UsersIcon className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <p className="text-foreground font-medium">Nenhum contato encontrado</p>
                        <p className="text-muted-foreground mt-1">Tente ajustar seus filtros ou adicione um novo.</p>
                      </td>
                    </tr>
                  ) : (
                    query.data?.contacts.map((contact) => (
                      <tr
                        key={contact.id}
                        className="hover:bg-muted/50 transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                            checked={selectedIds.has(contact.id)}
                            onChange={() => toggleSelect(contact.id)}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <Link href={`/crm/contatos/${contact.id}`}>
                            <div className="flex items-center gap-3 cursor-pointer">
                              <Avatar
                                size="md"
                                src={contact.avatarUrl ?? undefined}
                                fromName={contact.name ?? undefined}
                              />
                              <div>
                                <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                                  {contact.name || "Sem nome"}
                                </p>
                                {contact.company && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                    <Building2 className="w-3 h-3" />
                                    {contact.company}
                                  </p>
                                )}
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <p className="text-foreground flex items-center gap-1.5 text-xs">
                              <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                              {contact.phone}
                            </p>
                            {contact.email && (
                              <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                                {contact.email}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {contact.tags.slice(0, 3).map((t) => (
                              <Badge
                                key={t.id}
                                variant="neutral"
                                className="border-none text-xs font-normal"
                                style={{
                                  backgroundColor: `${t.color}20`,
                                  color: t.color,
                                }}
                              >
                                {t.name}
                              </Badge>
                            ))}
                            {contact.tags.length > 3 && (
                              <Badge variant="neutral" className="text-xs font-normal">
                                +{contact.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {contact.assignedTo ? (() => {
                            const agent = agents.data?.find((a) => a.clerkUserId === contact.assignedTo);
                            return agent ? (
                              <div className="flex items-center gap-2">
                                <Avatar
                                  size="xs"
                                  src={agent.avatarUrl ?? undefined}
                                  fromName={agent.firstName ?? agent.email}
                                />
                                <span className="text-xs text-muted-foreground">
                                  {agent.firstName ? `${agent.firstName} ${agent.lastName || ""}` : agent.email}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Desconhecido</span>
                            );
                          })() : (
                            <span className="text-xs text-muted-foreground italic">Não atribuído</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link href={`/crm/contatos/${contact.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {query.data && query.data.total > limit && (
              <div className="border-t border-border p-4 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Mostrando {(page - 1) * limit + 1} a {Math.min(page * limit, query.data.total)} de {query.data.total} contatos
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page * limit >= query.data.total}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </Card>
      </PageShell>
  );
}

function CreateContactDialog() {
  const [open, setOpen] = useState(false);
  const { createContact } = useContacts({});
  const { toast } = useToast();

  const [form, setForm] = useState({ phone: "", name: "", email: "", cpf: "", company: "" });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.phone.trim()) {
      toast({ title: "Telefone é obrigatório", variant: "destructive" });
      return;
    }
    const cpfDigits = form.cpf.replace(/\D/g, "");
    if (cpfDigits && !isValidCpf(cpfDigits)) {
      toast({ title: "CPF inválido", description: "Verifique os dígitos informados.", variant: "destructive" });
      return;
    }
    createContact.mutate(
      { ...form, cpf: cpfDigits || null, origin: "invite" as const },
      {
        onSuccess: () => {
          toast({ title: "Contato criado!" });
          setOpen(false);
          setForm({ phone: "", name: "", email: "", cpf: "", company: "" });
        },
      }
    );
  };

  return (
    <>
      <Button
        variant="primary"
        iconLeft={<Plus className="w-4 h-4" />}
        onClick={() => setOpen(true)}
      >
        Novo contato
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Novo contato">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome</label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Maria Silva" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">WhatsApp (com DDI e DDD)</label>
            <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Ex: 5511999999999" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">CPF</label>
            <Input value={form.cpf} onChange={e => setForm({ ...form, cpf: e.target.value })} placeholder="Ex: 000.000.000-00" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Ex: maria@empresa.com" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Empresa</label>
            <Input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Ex: Empresa S/A" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={createContact.isPending}>
              Salvar
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

function ImportCsvDialog() {
  const [open, setOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const { importCsv } = useContacts({});
  const { toast } = useToast();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvText(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const onSubmit = () => {
    if (!csvText.trim()) return;
    importCsv.mutate(csvText, {
      onSuccess: (res) => {
        toast({
          title: "Importação concluída",
          description: `${res.imported} importados, ${res.skipped} ignorados.`,
        });
        setOpen(false);
        setCsvText("");
      },
      onError: (err: any) => {
        toast({ title: "Erro na importação", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <>
      <Button
        variant="secondary"
        iconLeft={<Upload className="w-4 h-4" />}
        onClick={() => setOpen(true)}
      >
        Importar
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Importar contatos"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              loading={importCsv.isPending}
              disabled={!csvText.trim()}
              onClick={onSubmit}
            >
              Importar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-muted)]">
            Envie um arquivo .csv com cabeçalhos como{" "}
            <code className="font-mono">phone, name, cpf, email, company</code>.
            O telefone é obrigatório.
          </p>

          <Input
            label="Arquivo CSV"
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
          />

          <div className="text-center text-sm text-[var(--text-muted)]">
            ou cole o conteúdo abaixo
          </div>

          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            className="w-full h-32 p-3 rounded-md text-sm font-mono border border-[var(--border-default)] focus:outline-none focus:border-[var(--border-brand)]"
            placeholder="phone,name&#10;5511999999999,João Silva"
          />
        </div>
      </Dialog>
    </>
  );
}
