import { useUser } from "@/lib/devAuth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageShell } from "@/components/PageShell";
import { useTenantId, useMyRole } from "@/hooks/useTenantId";
import { TeamSection, DepartmentsSection } from "@/components/settings/team-management";

export default function SettingsPage() {
  const { user } = useUser();
  const tenantId = useTenantId();
  const role = useMyRole();
  const isAdmin = role === "admin" || role === "supervisor";

  return (
    <PageShell title="Configurações">
            
            <Card>
              <CardHeader>
                <CardTitle>Meu Perfil</CardTitle>
                <CardDescription>Informações da sua conta de usuário.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <Avatar className="w-16 h-16 border-2 border-border">
                    <AvatarImage src={user?.imageUrl} />
                    <AvatarFallback className="text-lg bg-muted text-foreground">
                      {user?.fullName?.substring(0, 2).toUpperCase() || "US"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium text-lg text-foreground">{user?.fullName || "Usuário"}</h3>
                    <p className="text-muted-foreground">{user?.primaryEmailAddress?.emailAddress || "email@exemplo.com"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Plano Atual</CardTitle>
                <CardDescription>Gerencie sua assinatura e limites de uso.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">Professional</h3>
                      <Badge className="bg-primary hover:bg-primary/90 border-none text-white">Ativo</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">50 agentes disponíveis • Faturamento mensal</p>
                  </div>
                  <button className="text-sm font-medium text-primary hover:underline">
                    Fazer Upgrade
                  </button>
                </div>
              </CardContent>
            </Card>

            {isAdmin && tenantId && (
              <>
                <TeamSection tenantId={tenantId} myUserId={user?.id} />
                <DepartmentsSection tenantId={tenantId} />
              </>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Notificações</CardTitle>
                <CardDescription>Configure como e quando você deseja ser alertado.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-medium text-foreground">Novas Mensagens</div>
                    <div className="text-sm text-muted-foreground">Notificar quando um cliente iniciar uma conversa.</div>
                  </div>
                  <Switch checked={true} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-medium text-foreground">Sons de Alerta</div>
                    <div className="text-sm text-muted-foreground">Tocar um som curto para notificações de desktop.</div>
                  </div>
                  <Switch checked={false} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-medium text-foreground">Relatório Diário</div>
                    <div className="text-sm text-muted-foreground">Receber um resumo por email no fim do dia.</div>
                  </div>
                  <Switch checked={true} />
                </div>
              </CardContent>
            </Card>

    </PageShell>
  );
}
