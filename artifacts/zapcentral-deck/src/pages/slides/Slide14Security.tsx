export default function Slide14Security() {
  return (
    <div style={{
      width: "100vw", height: "100vh", overflow: "hidden", backgroundColor: "#FAFBFC",
      fontFamily: "'Inter', sans-serif", padding: "4vh 4vw", boxSizing: "border-box",
      display: "grid", gridTemplateColumns: "1fr", gridTemplateRows: "auto 1fr auto",
      gap: "3vh", color: "#1E3A5F"
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E2E8F0", paddingBottom: "2vh" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.8vw" }}>
          <div style={{ width: "2vw", height: "2vw", backgroundColor: "#25D366", borderRadius: "0.4vw" }} />
          <div style={{ fontSize: "1.2vw", fontWeight: 700 }}>ZapCentral</div>
        </div>
        <div style={{ display: "flex", gap: "2vw", fontSize: "1vw", fontWeight: 500, color: "#64748B" }}>
          <div>SEGURANÇA E ISOLAMENTO</div><div>2026</div>
        </div>
      </div>

      {/* Content */}
      <div style={{ display: "flex", flexDirection: "column", gap: "3vh" }}>
        <div>
          <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#25D366", marginBottom: "1vh", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Multi-tenant seguro
          </div>
          <h1 style={{ fontSize: "3.5vw", fontWeight: 800, margin: 0, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
            Cada empresa, seus dados. Somente ela.
          </h1>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "2vw", flex: 1 }}>
          <div style={{ background: "#1E3A5F", padding: "3.5vh 2.5vw", borderRadius: "0.8vw", display: "flex", flexDirection: "column", gap: "2vh" }}>
            <div style={{ width: "3.5vw", height: "3.5vw", backgroundColor: "rgba(37,211,102,0.15)", borderRadius: "0.6vw", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: "1.8vw", color: "#25D366" }}>&#128274;</div>
            </div>
            <div style={{ fontSize: "1.3vw", fontWeight: 700, color: "#FFFFFF" }}>Isolamento total</div>
            <div style={{ fontSize: "0.95vw", color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>Cada central enxerga apenas seus próprios dados. Nenhuma informação de uma empresa vaza para outra.</div>
          </div>

          <div style={{ background: "#FFFFFF", padding: "3.5vh 2.5vw", borderRadius: "0.8vw", border: "1px solid #E2E8F0", boxShadow: "0 4px 12px rgba(30,58,95,0.06)", display: "flex", flexDirection: "column", gap: "2vh" }}>
            <div style={{ width: "3.5vw", height: "3.5vw", backgroundColor: "rgba(37,211,102,0.1)", borderRadius: "0.6vw", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: "1.8vw", color: "#25D366" }}>&#128683;</div>
            </div>
            <div style={{ fontSize: "1.3vw", fontWeight: 700, color: "#1E3A5F" }}>Revogação imediata</div>
            <div style={{ fontSize: "0.95vw", color: "#64748B", lineHeight: 1.5 }}>Acessos expirados ou revogados são bloqueados em tempo real em todas as rotas e notificações da plataforma.</div>
          </div>

          <div style={{ background: "#FFFFFF", padding: "3.5vh 2.5vw", borderRadius: "0.8vw", border: "1px solid #E2E8F0", boxShadow: "0 4px 12px rgba(30,58,95,0.06)", display: "flex", flexDirection: "column", gap: "2vh" }}>
            <div style={{ width: "3.5vw", height: "3.5vw", backgroundColor: "rgba(37,211,102,0.1)", borderRadius: "0.6vw", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: "1.8vw", color: "#25D366" }}>&#128100;</div>
            </div>
            <div style={{ fontSize: "1.3vw", fontWeight: 700, color: "#1E3A5F" }}>Acesso restrito</div>
            <div style={{ fontSize: "0.95vw", color: "#64748B", lineHeight: 1.5 }}>Avisos e mensagens internas chegam somente a membros ativos. Quem saiu da central não recebe nada.</div>
          </div>
        </div>

        <div style={{ background: "#F0FDF4", padding: "2vh 2.5vw", borderRadius: "0.6vw", border: "1px solid #BBF7D0", display: "flex", alignItems: "center", gap: "1.5vw" }}>
          <div style={{ width: "0.5vw", height: "4vh", backgroundColor: "#25D366", borderRadius: "1vw", flexShrink: 0 }} />
          <div style={{ fontSize: "1vw", color: "#166534", lineHeight: 1.5 }}>
            Todas as ações da plataforma passam por verificação de membership ativo — não existe acesso por bypass ou acesso de superadmin que escapa das regras de tenant.
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #E2E8F0", paddingTop: "2vh", fontSize: "0.85vw", color: "#94A3B8", fontWeight: 500 }}>
        <div>ZapCentral — Central Operacional Inteligente</div>
        <div>14 de 16</div>
      </div>
    </div>
  );
}
