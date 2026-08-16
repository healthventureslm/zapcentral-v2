export default function Slide13Tech() {
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
          <div>TECNOLOGIA</div><div>2026</div>
        </div>
      </div>

      {/* Content */}
      <div style={{ display: "flex", flexDirection: "column", gap: "3vh" }}>
        <div>
          <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#25D366", marginBottom: "1vh", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Stack de produção
          </div>
          <h1 style={{ fontSize: "3.5vw", fontWeight: 800, margin: 0, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
            Construído para escalar
          </h1>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2vw", flex: 1 }}>
          <div style={{ background: "#FFFFFF", padding: "3vh 2.5vw", borderRadius: "0.8vw", border: "1px solid #E2E8F0", boxShadow: "0 4px 12px rgba(30,58,95,0.06)", display: "flex", gap: "2vw", alignItems: "flex-start" }}>
            <div style={{ width: "4vw", height: "4vw", backgroundColor: "#25D366", borderRadius: "0.8vw", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ fontSize: "1.6vw", fontWeight: 800, color: "#FFFFFF" }}>WA</div>
            </div>
            <div>
              <div style={{ fontSize: "1.3vw", fontWeight: 700, color: "#1E3A5F", marginBottom: "0.8vh" }}>Evolution API</div>
              <div style={{ fontSize: "0.95vw", color: "#64748B", lineHeight: 1.5 }}>Conexão via QR Code, sem gambiarras no celular. Instâncias estáveis e confiáveis para WhatsApp.</div>
            </div>
          </div>

          <div style={{ background: "#FFFFFF", padding: "3vh 2.5vw", borderRadius: "0.8vw", border: "1px solid #E2E8F0", boxShadow: "0 4px 12px rgba(30,58,95,0.06)", display: "flex", gap: "2vw", alignItems: "flex-start" }}>
            <div style={{ width: "4vw", height: "4vw", backgroundColor: "#1E3A5F", borderRadius: "0.8vw", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ fontSize: "1.6vw", fontWeight: 800, color: "#25D366" }}>R</div>
            </div>
            <div>
              <div style={{ fontSize: "1.3vw", fontWeight: 700, color: "#1E3A5F", marginBottom: "0.8vh" }}>React + WebSocket</div>
              <div style={{ fontSize: "0.95vw", color: "#64748B", lineHeight: 1.5 }}>Interface moderna e rápida com atualização em tempo real. Notificações instantâneas sem recarregar a página.</div>
            </div>
          </div>

          <div style={{ background: "#FFFFFF", padding: "3vh 2.5vw", borderRadius: "0.8vw", border: "1px solid #E2E8F0", boxShadow: "0 4px 12px rgba(30,58,95,0.06)", display: "flex", gap: "2vw", alignItems: "flex-start" }}>
            <div style={{ width: "4vw", height: "4vw", backgroundColor: "#336791", borderRadius: "0.8vw", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ fontSize: "1.6vw", fontWeight: 800, color: "#FFFFFF" }}>PG</div>
            </div>
            <div>
              <div style={{ fontSize: "1.3vw", fontWeight: 700, color: "#1E3A5F", marginBottom: "0.8vh" }}>PostgreSQL</div>
              <div style={{ fontSize: "0.95vw", color: "#64748B", lineHeight: 1.5 }}>Banco de dados robusto com isolamento total por empresa. Cada tenant só enxerga seus próprios dados.</div>
            </div>
          </div>

          <div style={{ background: "#FFFFFF", padding: "3vh 2.5vw", borderRadius: "0.8vw", border: "1px solid #E2E8F0", boxShadow: "0 4px 12px rgba(30,58,95,0.06)", display: "flex", gap: "2vw", alignItems: "flex-start" }}>
            <div style={{ width: "4vw", height: "4vw", backgroundColor: "#6C47FF", borderRadius: "0.8vw", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ fontSize: "1.6vw", fontWeight: 800, color: "#FFFFFF" }}>CL</div>
            </div>
            <div>
              <div style={{ fontSize: "1.3vw", fontWeight: 700, color: "#1E3A5F", marginBottom: "0.8vh" }}>Clerk Auth</div>
              <div style={{ fontSize: "0.95vw", color: "#64748B", lineHeight: 1.5 }}>Autenticação gerenciada com e-mail/senha e Google OAuth. Sessões seguras e tokens de curta duração.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #E2E8F0", paddingTop: "2vh", fontSize: "0.85vw", color: "#94A3B8", fontWeight: 500 }}>
        <div>ZapCentral — Central Operacional Inteligente</div>
        <div>13 de 16</div>
      </div>
    </div>
  );
}
