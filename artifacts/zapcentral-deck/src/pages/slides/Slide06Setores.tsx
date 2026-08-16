export default function Slide06Setores() {
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
          <div>SETORES E RAMAIS</div><div>2026</div>
        </div>
      </div>

      {/* Content */}
      <div style={{ display: "flex", flexDirection: "column", gap: "3vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#25D366", marginBottom: "1vh", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Estrutura estilo PABX
          </div>
          <h1 style={{ fontSize: "3.5vw", fontWeight: 800, margin: 0, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
            Cada setor, sua fila e sua equipe
          </h1>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "2vw" }}>
          <div style={{ background: "#FFFFFF", padding: "3.5vh 2.5vw", borderRadius: "0.8vw", border: "1px solid #E2E8F0", boxShadow: "0 4px 12px rgba(30,58,95,0.06)" }}>
            <div style={{ width: "4vw", height: "4vw", backgroundColor: "rgba(37,211,102,0.1)", borderRadius: "0.6vw", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2vh" }}>
              <div style={{ fontSize: "2vw", fontWeight: 800, color: "#25D366" }}>S</div>
            </div>
            <div style={{ fontSize: "1.3vw", fontWeight: 700, color: "#1E3A5F", marginBottom: "1vh" }}>Setores independentes</div>
            <div style={{ fontSize: "0.95vw", color: "#64748B", lineHeight: 1.5 }}>Cada setor tem sua própria fila, equipe e configuração de atendimento separada.</div>
          </div>
          <div style={{ background: "#FFFFFF", padding: "3.5vh 2.5vw", borderRadius: "0.8vw", border: "1px solid #E2E8F0", boxShadow: "0 4px 12px rgba(30,58,95,0.06)" }}>
            <div style={{ width: "4vw", height: "4vw", backgroundColor: "rgba(37,211,102,0.1)", borderRadius: "0.6vw", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2vh" }}>
              <div style={{ fontSize: "2vw", fontWeight: 800, color: "#25D366" }}>A</div>
            </div>
            <div style={{ fontSize: "1.3vw", fontWeight: 700, color: "#1E3A5F", marginBottom: "1vh" }}>Agentes multi-setor</div>
            <div style={{ fontSize: "0.95vw", color: "#64748B", lineHeight: 1.5 }}>Um agente pode pertencer a um ou mais setores, conforme a necessidade da operação.</div>
          </div>
          <div style={{ background: "#FFFFFF", padding: "3.5vh 2.5vw", borderRadius: "0.8vw", border: "1px solid #E2E8F0", boxShadow: "0 4px 12px rgba(30,58,95,0.06)" }}>
            <div style={{ width: "4vw", height: "4vw", backgroundColor: "rgba(37,211,102,0.1)", borderRadius: "0.6vw", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2vh" }}>
              <div style={{ fontSize: "2vw", fontWeight: 800, color: "#25D366" }}>C</div>
            </div>
            <div style={{ fontSize: "1.3vw", fontWeight: 700, color: "#1E3A5F", marginBottom: "1vh" }}>Capacidade controlada</div>
            <div style={{ fontSize: "0.95vw", color: "#64748B", lineHeight: 1.5 }}>Defina quantas conversas simultâneas cada agente pode receber sem sobrecarregar a equipe.</div>
          </div>
        </div>

        <div style={{ background: "#1E3A5F", padding: "2.5vh 3vw", borderRadius: "0.8vw", display: "flex", justifyContent: "space-around", alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2.5vw", fontWeight: 800, color: "#25D366" }}>Vendas</div>
            <div style={{ fontSize: "0.9vw", color: "rgba(255,255,255,0.6)", marginTop: "0.5vh" }}>Setor comercial</div>
          </div>
          <div style={{ width: "1px", height: "4vh", backgroundColor: "rgba(255,255,255,0.15)" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2.5vw", fontWeight: 800, color: "#25D366" }}>Suporte</div>
            <div style={{ fontSize: "0.9vw", color: "rgba(255,255,255,0.6)", marginTop: "0.5vh" }}>Setor técnico</div>
          </div>
          <div style={{ width: "1px", height: "4vh", backgroundColor: "rgba(255,255,255,0.15)" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2.5vw", fontWeight: 800, color: "#25D366" }}>Financeiro</div>
            <div style={{ fontSize: "0.9vw", color: "rgba(255,255,255,0.6)", marginTop: "0.5vh" }}>Cobranças e pagamentos</div>
          </div>
          <div style={{ width: "1px", height: "4vh", backgroundColor: "rgba(255,255,255,0.15)" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2.5vw", fontWeight: 800, color: "rgba(255,255,255,0.4)" }}>+ setores</div>
            <div style={{ fontSize: "0.9vw", color: "rgba(255,255,255,0.4)", marginTop: "0.5vh" }}>Personalizáveis</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #E2E8F0", paddingTop: "2vh", fontSize: "0.85vw", color: "#94A3B8", fontWeight: 500 }}>
        <div>ZapCentral — Central Operacional Inteligente</div>
        <div>6 de 16</div>
      </div>
    </div>
  );
}
