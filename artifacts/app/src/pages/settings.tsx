import { Settings as SettingsIcon } from "lucide-react";
import { useUser } from "@/lib/devAuth";
import {
  Avatar,
  Badge,
  Card,
  CardBody,
  CardHeader,
  Switch,
} from "@healthventureslm/design-system";
import { PageShell } from "@/components/PageShell";
import { useTenantId, useMyRole } from "@/hooks/useTenantId";
import { TeamSection, DepartmentsSection } from "@/components/settings/team-management";

export default function SettingsPage() {
  const { user } = useUser();
  const tenantId = useTenantId();
  const role = useMyRole();
  const isAdmin = role === "admin" || role === "supervisor";

  return (
    <PageShell title="Configurações" icon={<SettingsIcon />}>
            
            <Card>
              <CardHeader title={<>Meu Perfil</>} subtitle={<>Informações da sua conta de usuário.</>} />
              <CardBody>
                <div className="flex items-center space-x-4">
                  <Avatar
                    size="lg"
                    src={user?.imageUrl}
                    fromName={user?.fullName ?? undefined}
                  />
                  <div>
                    <h3 className="font-medium text-lg text-foreground">{user?.fullName || "Usuário"}</h3>
                    <p className="text-muted-foreground">{user?.primaryEmailAddress?.emailAddress || "email@exemplo.com"}</p>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title={<>Plano Atual</>} subtitle={<>Gerencie sua assinatura e limites de uso.</>} />
              <CardBody>
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
              </CardBody>
            </Card>

            {isAdmin && tenantId && (
              <>
                <TeamSection tenantId={tenantId} myUserId={user?.id} />
                <DepartmentsSection tenantId={tenantId} />
              </>
            )}

            <Card>
              <CardHeader title={<>Notificações</>} subtitle={<>Configure como e quando você deseja ser alertado.</>} />
              <CardBody className="space-y-4">
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
              </CardBody>
            </Card>

    </PageShell>
  );
}
