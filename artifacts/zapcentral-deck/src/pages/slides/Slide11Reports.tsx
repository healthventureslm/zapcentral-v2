export default function Slide11Reports() {
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
          <div>RELATÓRIOS E MÉTRICAS</div><div>2026</div>
        </div>
      </div>

      {/* Content */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2.5vh" }}>
        <div>
          <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#25D366", marginBottom: "1vh", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Dados para decisão
          </div>
          <h1 style={{ fontSize: "3.5vw", fontWeight: 800, margin: 0, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
            O que você mede, você melhora
          </h1>
        </div>

        {/* KPI Cards row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1.5vw" }}>
          <div style={{ background: "#FFFFFF", padding: "2.5vh 2vw", borderRadius: "0.8vw", border: "1px solid #E2E8F0", boxShadow: "0 4px 12px rgba(30,58,95,0.06)", textAlign: "center" }}>
            <div style={{ fontSize: "0.8vw", fontWeight: 600, color: "#64748B", textTransform: "uppercase", marginBottom: "1vh" }}>Conversas</div>
            <div style={{ fontSize: "3.5vw", fontWeight: 700, color: "#1E3A5F" }}>Total</div>
            <div style={{ fontSize: "0.85vw", color: "#25D366", marginTop: "0.5vh" }}>+ Fechadas</div>
          </div>
          <div style={{ background: "#FFFFFF", padding: "2.5vh 2vw", borderRadius: "0.8vw", border: "1px solid #E2E8F0", boxShadow: "0 4px 12px rgba(30,58,95,0.06)", textAlign: "center" }}>
            <div style={{ fontSize: "0.8vw", fontWeight: 600, color: "#64748B", textTransform: "uppercase", marginBottom: "1vh" }}>1ª Resposta</div>
            <div style={{ fontSize: "3.5vw", fontWeight: 700, color: "#1E3A5F" }}>TM</div>
            <div style={{ fontSize: "0.85vw", color: "#25D366", marginTop: "0.5vh" }}>Só mensagens humanas</div>
          </div>
          <div style={{ background: "#FFFFFF", padding: "2.5vh 2vw", borderRadius: "0.8vw", border: "1px solid #E2E8F0", boxShadow: "0 4px 12px rgba(30,58,95,0.06)", textAlign: "center" }}>
            <div style={{ fontSize: "0.8vw", fontWeight: 600, color: "#64748B", textTransform: "uppercase", marginBottom: "1vh" }}>Resolução</div>
            <div style={{ fontSize: "3.5vw", fontWeight: 700, color: "#1E3A5F" }}>TM</div>
            <div style={{ fontSize: "0.85vw", color: "#25D366", marginTop: "0.5vh" }}>Início ao fechamento</div>
          </div>
          <div style={{ background: "#1E3A5F", padding: "2.5vh 2vw", borderRadius: "0.8vw", textAlign: "center" }}>
            <div style={{ fontSize: "0.8vw", fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: "1vh" }}>Satisfação</div>
            <div style={{ fontSize: "3.5vw", fontWeight: 700, color: "#25D366" }}>1–5</div>
            <div style={{ fontSize: "0.85vw", color: "rgba(255,255,255,0.6)", marginTop: "0.5vh" }}>Nota média por setor</div>
          </div>
        </div>

        {/* Chart + features */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "2vw", flex: 1 }}>
          <div style={{ background: "#FFFFFF", padding: "3vh 2.5vw", borderRadius: "0.8vw", border: "1px solid #E2E8F0", boxShadow: "0 4px 12px rgba(30,58,95,0.06)" }}>
            <div style={{ fontSize: "1vw", fontWeight: 600, color: "#1E3A5F", marginBottom: "2.5vh" }}>Volume por período</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "1vw", height: "14vh", borderBottom: "2px solid #E2E8F0", paddingBottom: "1vh" }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5vh" }}>
                <div style={{ width: "100%", height: "6vh", backgroundColor: "rgba(37,211,102,0.2)", borderRadius: "0.3vw 0.3vw 0 0" }} />
                <div style={{ fontSize: "0.75vw", color: "#64748B" }}>Seg</div>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5vh" }}>
                <div style={{ width: "100%", height: "10vh", backgroundColor: "rgba(37,211,102,0.45)", borderRadius: "0.3vw 0.3vw 0 0" }} />
                <div style={{ fontSize: "0.75vw", color: "#64748B" }}>Ter</div>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5vh" }}>
                <div style={{ width: "100%", height: "8vh", backgroundColor: "rgba(37,211,102,0.35)", borderRadius: "0.3vw 0.3vw 0 0" }} />
                <div style={{ fontSize: "0.75vw", color: "#64748B" }}>Qua</div>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5vh" }}>
                <div style={{ width: "100%", height: "13vh", backgroundColor: "rgba(37,211,102,0.65)", borderRadius: "0.3vw 0.3vw 0 0" }} />
                <div style={{ fontSize: "0.75vw", color: "#64748B" }}>Qui</div>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5vh" }}>
                <div style={{ width: "100%", height: "14vh", backgroundColor: "#25D366", borderRadius: "0.3vw 0.3vw 0 0" }} />
                <div style={{ fontSize: "0.75vw", color: "#64748B" }}>Sex</div>
              </div>
            </div>
          </div>
          <div style={{ background: "#FFFFFF", padding: "3vh 2.5vw", borderRadius: "0.8vw", border: "1px solid #E2E8F0", boxShadow: "0 4px 12px rgba(30,58,95,0.06)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ fontSize: "1vw", fontWeight: 600, color: "#1E3A5F", marginBottom: "2vh" }}>Filtros disponíveis</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.2vh", flex: 1, justifyContent: "center" }}>
              <div style={{ fontSize: "0.9vw", color: "#475569" }}>— Por setor</div>
              <div style={{ fontSize: "0.9vw", color: "#475569" }}>— Por agente</div>
              <div style={{ fontSize: "0.9vw", color: "#475569" }}>— Por tag</div>
              <div style={{ fontSize: "0.9vw", color: "#475569" }}>— Por período</div>
            </div>
            <div style={{ padding: "1.2vh 1.2vw", backgroundColor: "#F0FDF4", borderRadius: "0.5vw", fontSize: "0.85vw", color: "#16A34A", fontWeight: 600, textAlign: "center" }}>
              Exportação em CSV
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #E2E8F0", paddingTop: "2vh", fontSize: "0.85vw", color: "#94A3B8", fontWeight: 500 }}>
        <div>ZapCentral — Central Operacional Inteligente</div>
        <div>11 de 16</div>
      </div>
    </div>
  );
}
