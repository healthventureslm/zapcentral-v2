const base = import.meta.env.BASE_URL;

export default function Slide01Title() {
  return (
    <div style={{
      width: "100vw", height: "100vh", overflow: "hidden", backgroundColor: "#FAFBFC",
      fontFamily: "'Inter', sans-serif", padding: "4vh 4vw", boxSizing: "border-box",
      display: "grid", gridTemplateColumns: "3fr 2fr", gridTemplateRows: "auto 1fr auto",
      gap: "3vh 4vw", color: "#1E3A5F"
    }}>
      {/* Header */}
      <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E2E8F0", paddingBottom: "2vh" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.8vw" }}>
          <div style={{ width: "2vw", height: "2vw", backgroundColor: "#25D366", borderRadius: "0.4vw" }} />
          <div style={{ fontSize: "1.2vw", fontWeight: 700, letterSpacing: "0.02em" }}>ZapCentral</div>
        </div>
        <div style={{ display: "flex", gap: "2vw", fontSize: "1vw", fontWeight: 500, color: "#64748B" }}>
          <div>APRESENTAÇÃO DO PRODUTO</div>
          <div>2026</div>
        </div>
      </div>

      {/* Main Left */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#25D366", marginBottom: "1.5vh", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Central Operacional Inteligente
        </div>
        <h1 style={{ fontSize: "6vw", fontWeight: 800, margin: "0 0 1.5vh 0", lineHeight: 1.05, letterSpacing: "-0.03em" }}>
          ZapCentral
        </h1>
        <p style={{ fontSize: "1.4vw", fontWeight: 400, color: "#475569", margin: "0 0 3.5vh 0", lineHeight: 1.55, maxWidth: "38vw", textWrap: "pretty" }}>
          Atendimento profissional via WhatsApp para equipes com setores, filas automáticas e CRM integrado.
        </p>
        <div style={{ display: "flex", gap: "1.5vw" }}>
          <div style={{ background: "#FFFFFF", padding: "2vh 1.8vw", borderRadius: "0.8vw", border: "1px solid #E2E8F0", flex: 1, boxShadow: "0 4px 12px rgba(30,58,95,0.06)" }}>
            <div style={{ fontSize: "0.85vw", fontWeight: 600, color: "#64748B", marginBottom: "0.8vh", textTransform: "uppercase", letterSpacing: "0.04em" }}>Atendimento</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.8vw" }}>
              <div style={{ fontSize: "3vw", fontWeight: 700, color: "#1E3A5F" }}>Multi-setor</div>
            </div>
            <div style={{ fontSize: "0.9vw", color: "#64748B", marginTop: "0.5vh" }}>Filas por departamento</div>
          </div>
          <div style={{ background: "#FFFFFF", padding: "2vh 1.8vw", borderRadius: "0.8vw", border: "1px solid #E2E8F0", flex: 1, boxShadow: "0 4px 12px rgba(30,58,95,0.06)" }}>
            <div style={{ fontSize: "0.85vw", fontWeight: 600, color: "#64748B", marginBottom: "0.8vh", textTransform: "uppercase", letterSpacing: "0.04em" }}>Satisfação</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.8vw" }}>
              <div style={{ fontSize: "3vw", fontWeight: 700, color: "#1E3A5F" }}>1 – 5</div>
              <div style={{ fontSize: "0.9vw", fontWeight: 600, color: "#25D366", backgroundColor: "rgba(37,211,102,0.1)", padding: "0.4vh 0.7vw", borderRadius: "2vw" }}>Pesquisa</div>
            </div>
            <div style={{ fontSize: "0.9vw", color: "#64748B", marginTop: "0.5vh" }}>Avaliação automática</div>
          </div>
        </div>
      </div>

      {/* Main Right */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ background: "#FFFFFF", padding: "3vh 2.5vw", borderRadius: "0.8vw", border: "1px solid #E2E8F0", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", boxSizing: "border-box", boxShadow: "0 4px 12px rgba(30,58,95,0.06)" }}>
          <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#1E3A5F" }}>Volume de Atendimentos</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "1.2vw", height: "18vh", borderBottom: "2px solid #E2E8F0", paddingBottom: "1vh" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.8vh" }}>
              <div style={{ width: "100%", height: "8vh", backgroundColor: "rgba(37,211,102,0.2)", borderRadius: "0.3vw 0.3vw 0 0" }} />
              <div style={{ fontSize: "0.85vw", color: "#64748B", fontWeight: 500 }}>Jan</div>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.8vh" }}>
              <div style={{ width: "100%", height: "11vh", backgroundColor: "rgba(37,211,102,0.35)", borderRadius: "0.3vw 0.3vw 0 0" }} />
              <div style={{ fontSize: "0.85vw", color: "#64748B", fontWeight: 500 }}>Mar</div>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.8vh" }}>
              <div style={{ width: "100%", height: "14vh", backgroundColor: "rgba(37,211,102,0.6)", borderRadius: "0.3vw 0.3vw 0 0" }} />
              <div style={{ fontSize: "0.85vw", color: "#64748B", fontWeight: 500 }}>Jun</div>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.8vh" }}>
              <div style={{ width: "100%", height: "17vh", backgroundColor: "#25D366", borderRadius: "0.3vw 0.3vw 0 0" }} />
              <div style={{ fontSize: "0.85vw", color: "#64748B", fontWeight: 500 }}>Set</div>
            </div>
          </div>
          <div style={{ fontSize: "0.9vw", color: "#64748B" }}>Crescimento contínuo com escala</div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #E2E8F0", paddingTop: "2vh", fontSize: "0.85vw", color: "#94A3B8", fontWeight: 500 }}>
        <div>ZapCentral — Central Operacional Inteligente</div>
        <div>1 de 16</div>
      </div>
    </div>
  );
}
