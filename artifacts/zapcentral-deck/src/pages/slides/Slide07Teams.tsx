export default function Slide07Teams() {
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
          <div>EQUIPES E PERMISSÕES</div><div>2026</div>
        </div>
      </div>

      {/* Content */}
      <div style={{ display: "flex", flexDirection: "column", gap: "3vh" }}>
        <div>
          <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#25D366", marginBottom: "1vh", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Multi-tenant
          </div>
          <h1 style={{ fontSize: "3.5vw", fontWeight: 800, margin: 0, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
            Cada empresa, sua central isolada
          </h1>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "2vw", flex: 1 }}>
          <div style={{ background: "#1E3A5F", padding: "3.5vh 2.5vw", borderRadius: "0.8vw", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "0.85vw", fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1.5vh" }}>Administrador</div>
              <div style={{ fontSize: "2vw", fontWeight: 800, color: "#FFFFFF", marginBottom: "2vh" }}>Controle total</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1.2vh" }}>
                <div style={{ fontSize: "0.95vw", color: "rgba(255,255,255,0.75)" }}>— Criar e gerenciar setores</div>
                <div style={{ fontSize: "0.95vw", color: "rgba(255,255,255,0.75)" }}>— Adicionar e revogar agentes</div>
                <div style={{ fontSize: "0.95vw", color: "rgba(255,255,255,0.75)" }}>— Ver todos os relatórios</div>
                <div style={{ fontSize: "0.95vw", color: "rgba(255,255,255,0.75)" }}>— Configurar a plataforma</div>
              </div>
            </div>
            <div style={{ marginTop: "2vh", padding: "1.2vh 1.5vw", backgroundColor: "rgba(37,211,102,0.15)", borderRadius: "0.5vw", fontSize: "0.9vw", color: "#25D366", fontWeight: 600 }}>
              Acesso completo
            </div>
          </div>

          <div style={{ background: "#FFFFFF", padding: "3.5vh 2.5vw", borderRadius: "0.8vw", border: "1px solid #E2E8F0", display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "0 4px 12px rgba(30,58,95,0.06)" }}>
            <div>
              <div style={{ fontSize: "0.85vw", fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1.5vh" }}>Supervisor</div>
              <div style={{ fontSize: "2vw", fontWeight: 800, color: "#1E3A5F", marginBottom: "2vh" }}>Visão gerencial</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1.2vh" }}>
                <div style={{ fontSize: "0.95vw", color: "#475569" }}>— Monitorar atendimentos ao vivo</div>
                <div style={{ fontSize: "0.95vw", color: "#475569" }}>— Acessar relatórios do setor</div>
                <div style={{ fontSize: "0.95vw", color: "#475569" }}>— Transferir conversas</div>
                <div style={{ fontSize: "0.95vw", color: "#475569" }}>— Encerrar atendimentos</div>
              </div>
            </div>
            <div style={{ marginTop: "2vh", padding: "1.2vh 1.5vw", backgroundColor: "#EEF2FF", borderRadius: "0.5vw", fontSize: "0.9vw", color: "#4F46E5", fontWeight: 600 }}>
              Seu setor
            </div>
          </div>

          <div style={{ background: "#FFFFFF", padding: "3.5vh 2.5vw", borderRadius: "0.8vw", border: "1px solid #E2E8F0", display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "0 4px 12px rgba(30,58,95,0.06)" }}>
            <div>
              <div style={{ fontSize: "0.85vw", fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1.5vh" }}>Agente</div>
              <div style={{ fontSize: "2vw", fontWeight: 800, color: "#1E3A5F", marginBottom: "2vh" }}>Foco no cliente</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1.2vh" }}>
                <div style={{ fontSize: "0.95vw", color: "#475569" }}>— Receber e responder conversas</div>
                <div style={{ fontSize: "0.95vw", color: "#475569" }}>— Chat interno com colegas</div>
                <div style={{ fontSize: "0.95vw", color: "#475569" }}>— Ver histórico do cliente</div>
                <div style={{ fontSize: "0.95vw", color: "#475569" }}>— Encerrar com nota</div>
              </div>
            </div>
            <div style={{ marginTop: "2vh", padding: "1.2vh 1.5vw", backgroundColor: "#F0FDF4", borderRadius: "0.5vw", fontSize: "0.9vw", color: "#16A34A", fontWeight: 600 }}>
              Acessos temporários disponíveis
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #E2E8F0", paddingTop: "2vh", fontSize: "0.85vw", color: "#94A3B8", fontWeight: 500 }}>
        <div>ZapCentral — Central Operacional Inteligente</div>
        <div>7 de 16</div>
      </div>
    </div>
  );
}
