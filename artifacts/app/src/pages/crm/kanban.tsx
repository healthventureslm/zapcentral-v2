import { useState } from "react";
import {
  Avatar,
  Button,
  Dialog,
  Input,
  Menu,
  Select,
} from "@healthventureslm/design-system";
import { PageShell } from "@/components/PageShell";
import { CrmTabs } from "@/components/crm/crm-tabs";
import { useCrmHooks, useDeals, useContacts } from "@/hooks/use-crm";
import {
  KanbanSquare,
  Plus,
  Loader2,
  DollarSign,
  Calendar,
  MoreVertical,
  GripHorizontal,
  Settings2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Link } from "wouter";

export default function KanbanPage() {
  const { tenantId, dealStages, agents } = useCrmHooks();
  const { query: dealsQuery, updateDeal } = useDeals({ status: "open" });
  const { toast } = useToast();

  const [draggedDealId, setDraggedDealId] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, dealId: number) => {
    setDraggedDealId(dealId);
    e.dataTransfer.effectAllowed = "move";
    // Slight delay to allow visual drag clone before hiding
    setTimeout(() => {
      const el = document.getElementById(`deal-${dealId}`);
      if (el) el.style.opacity = "0.5";
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent, dealId: number) => {
    setDraggedDealId(null);
    const el = document.getElementById(`deal-${dealId}`);
    if (el) el.style.opacity = "1";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, stageId: number) => {
    e.preventDefault();
    if (!draggedDealId) return;
    
    const deal = dealsQuery.data?.find(d => d.id === draggedDealId);
    if (deal && deal.stageId !== stageId) {
      updateDeal.mutate({ id: draggedDealId, data: { stageId } }, {
        onError: () => toast({ title: "Erro ao mover", variant: "destructive" })
      });
    }
  };

  return (
    <PageShell
      icon={<KanbanSquare />}
        title="Funil de vendas"
        actions={
          <div className="flex items-center gap-3">
            <ManageStagesDialog />
            <CreateDealDialog />
          </div>
        }
      >
        <CrmTabs />
        {/* O quadro rola na horizontal dentro da largura da pagina, em vez de
            correr ate a borda da janela: assim ele fica alinhado com as demais
            telas e o limite de leitura continua valendo. */}
        <div className="overflow-x-auto pb-2">
          {dealStages.isLoading || dealsQuery.isLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="flex h-full gap-6 items-start">
              {dealStages.data?.sort((a,b) => a.position - b.position).map(stage => {
                const stageDeals = dealsQuery.data?.filter(d => d.stageId === stage.id) || [];
                const stageTotal = stageDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
                
                return (
                  <div
                    key={stage.id}
                    className="flex-shrink-0 w-80 max-h-full flex flex-col bg-muted/50 rounded-xl border border-border/60"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, stage.id)}
                  >
                    <div className="p-3 border-b border-border/60">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-foreground flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color || "#ccc" }} />
                          {stage.name}
                        </h3>
                        <span className="text-xs font-medium bg-card px-2 py-0.5 rounded-full text-muted-foreground shadow-sm border border-border">
                          {stageDeals.length}
                        </span>
                      </div>
                      <div className="text-xs font-medium text-muted-foreground pl-4.5">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stageTotal)}
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[150px]">
                      {stageDeals.map(deal => (
                        <div
                          key={deal.id}
                          id={`deal-${deal.id}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, deal.id)}
                          onDragEnd={(e) => handleDragEnd(e, deal.id)}
                          className="bg-card rounded-lg shadow-sm border border-border p-3.5 cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors group relative"
                        >
                          <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <DealActionsMenu deal={deal} />
                          </div>
                          
                          <h4 className="font-medium text-foreground text-sm mb-1 pr-6">{deal.title}</h4>
                          
                          <Link href={`/crm/contatos/${deal.contactId}`}>
                            <p className="text-xs text-blue-600 hover:underline mb-3">{deal.contactName}</p>
                          </Link>

                          <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
                            {deal.value ? (
                              <span className="text-xs font-semibold text-foreground flex items-center">
                                <DollarSign className="w-3 h-3 text-green-600 mr-0.5" />
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(deal.value))}
                              </span>
                            ) : <span />}
                            
                            {deal.assignedTo &&
                              (() => {
                                const agent = agents.data?.find(
                                  (a) => a.clerkUserId === deal.assignedTo,
                                );
                                return (
                                  <Avatar
                                    size="xs"
                                    src={agent?.avatarUrl ?? undefined}
                                    fromName={agent?.firstName ?? agent?.email}
                                  />
                                );
                              })()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {dealStages.data?.length === 0 && (
                <div className="w-full text-center py-20 text-muted-foreground">
                  Nenhuma etapa de funil configurada. Crie as etapas em "Gerenciar Etapas".
                </div>
              )}
            </div>
          )}
        </div>
      </PageShell>
  );
}

function ManageStagesDialog() {
  const [open, setOpen] = useState(false);
  const { dealStages, createDealStage, deleteDealStage } = useCrmHooks();
  const { toast } = useToast();

  const [newStage, setNewStage] = useState({ name: "", color: "#25D366" });

  const handleAdd = () => {
    if (!newStage.name) return;
    createDealStage.mutate({ name: newStage.name, color: newStage.color, position: (dealStages.data?.length || 0) + 1 }, {
      onSuccess: () => {
        setNewStage({ name: "", color: "#25D366" });
        toast({ title: "Etapa adicionada" });
      }
    });
  };

  const handleDelete = (id: number) => {
    deleteDealStage.mutate(id, {
      onSuccess: () => toast({ title: "Etapa excluída" }),
      onError: (err: any) => {
        if (err.status === 409) {
          toast({ title: "Não é possível excluir", description: "A etapa possui negócios. Mova-os primeiro.", variant: "destructive" });
        }
      }
    });
  };

  return (
    <>
      <Button
        variant="secondary"
        iconLeft={<Settings2 className="w-4 h-4" />}
        onClick={() => setOpen(true)}
      >
        Gerenciar etapas
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Etapas do funil">
        <div className="space-y-4">
          <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {dealStages.data?.sort((a,b) => a.position - b.position).map(stage => (
              <li key={stage.id} className="flex items-center justify-between p-2 border rounded-md bg-muted">
                <div className="flex items-center gap-2">
                  <GripHorizontal className="w-4 h-4 text-muted-foreground cursor-move" />
                  <input type="color" value={stage.color || "#000"} disabled className="w-6 h-6 p-0 border-0 rounded cursor-default" />
                  <span className="text-sm font-medium">{stage.name}</span>
                </div>
                <Button variant="quiet" size="sm" onClick={() => handleDelete(stage.id)}>
                  Excluir
                </Button>
              </li>
            ))}
          </ul>
          
          <div className="flex gap-2 items-center pt-4 border-t">
            <input 
              type="color" 
              value={newStage.color} 
              onChange={e => setNewStage({...newStage, color: e.target.value})}
              className="w-8 h-8 p-0 border-0 rounded cursor-pointer shrink-0" 
            />
            <Input 
              placeholder="Nova etapa..." 
              value={newStage.name} 
              onChange={e => setNewStage({...newStage, name: e.target.value})} 
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <Button
              variant="primary"
              loading={createDealStage.isPending}
              disabled={!newStage.name}
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

function CreateDealDialog() {
  const [open, setOpen] = useState(false);
  const { createDeal } = useDeals({});
  const { dealStages, agents } = useCrmHooks();
  const { query: contactsQuery } = useContacts({ limit: 100 }); // Quick list for select
  const { toast } = useToast();

  const [form, setForm] = useState<{
    title: string;
    contactId: string;
    stageId: string;
    value: string;
    assignedTo: string;
  }>({ title: "", contactId: "", stageId: "", value: "", assignedTo: "unassigned" });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.contactId || !form.stageId) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    
    createDeal.mutate({
      title: form.title,
      contactId: Number(form.contactId),
      stageId: Number(form.stageId),
      value: form.value ? Number(form.value) : null,
      assignedTo: form.assignedTo === "unassigned" ? null : form.assignedTo,
    }, {
      onSuccess: () => {
        toast({ title: "Negócio criado!" });
        setOpen(false);
        setForm({ title: "", contactId: "", stageId: "", value: "", assignedTo: "unassigned" });
      }
    });
  };

  return (
    <>
      <Button
        variant="primary"
        iconLeft={<Plus className="w-4 h-4" />}
        onClick={() => setOpen(true)}
      >
        Novo negócio
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Criar negócio">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Título (Obrigatório)</label>
            <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Ex: Projeto XPTO" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Contato (Obrigatório)</label>
              <Select
                placeholder="Selecione…"
                value={form.contactId}
                onChange={(v) => setForm({ ...form, contactId: v })}
                options={(contactsQuery.data?.contacts ?? []).map((c) => ({
                  value: String(c.id),
                  label: c.name || c.phone,
                }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Etapa (Obrigatório)</label>
              <Select
                placeholder="Selecione…"
                value={form.stageId}
                onChange={(v) => setForm({ ...form, stageId: v })}
                options={(dealStages.data ?? []).map((s) => ({
                  value: String(s.id),
                  label: s.name,
                }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Valor Estimado (R$)</label>
              <Input type="number" step="0.01" value={form.value} onChange={e => setForm({...form, value: e.target.value})} placeholder="Ex: 5000.00" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Responsável</label>
              <Select
                placeholder="Responsável…"
                value={form.assignedTo}
                onChange={(v) => setForm({ ...form, assignedTo: v })}
                options={[
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
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={createDeal.isPending}>
              Salvar
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

function DealActionsMenu({ deal }: { deal: any }) {
  const { updateDeal, deleteDeal } = useDeals({});
  const { toast } = useToast();

  const handleStatus = (status: "won" | "lost") => {
    updateDeal.mutate({ id: deal.id, data: { status } }, {
      onSuccess: () => toast({ title: status === 'won' ? "Negócio Ganho! 🎉" : "Negócio Perdido" })
    });
  };

  const handleDelete = () => {
    if(confirm("Excluir este negócio?")) {
      deleteDeal.mutate(deal.id, {
        onSuccess: () => toast({ title: "Negócio excluído" })
      });
    }
  };

  return (
    <Menu
      align="end"
      trigger={
        <Button variant="quiet" size="sm">
          <MoreVertical className="w-3 h-3" />
        </Button>
      }
      items={[
        { id: "won", label: "Marcar como ganho", onSelect: () => handleStatus("won") },
        { id: "lost", label: "Marcar como perdido", onSelect: () => handleStatus("lost") },
        { type: "separator" },
        { id: "delete", label: "Excluir negócio", danger: true, onSelect: handleDelete },
      ]}
    />
  );
}
