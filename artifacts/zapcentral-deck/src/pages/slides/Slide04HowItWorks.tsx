export default function Slide04HowItWorks() {
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
          <div>COMO FUNCIONA</div><div>2026</div>
        </div>
      </div>

      {/* Content */}
      <div style={{ display: "flex", flexDirection: "column", gap: "3vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#25D366", marginBottom: "1vh", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Jornada do atendimento
          </div>
          <h1 style={{ fontSize: "3.5vw", fontWeight: 800, margin: 0, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
            Do primeiro contato à avaliação final
          </h1>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto 1fr auto 1fr", gap: "0", alignItems: "center" }}>
          <div style={{ background: "#FFFFFF", padding: "3vh 2vw", borderRadius: "0.8vw", border: "1px solid #E2E8F0", textAlign: "center", boxShadow: "0 4px 12px rgba(30,58,95,0.06)" }}>
            <div style={{ width: "4vw", height: "4vw", backgroundColor: "rgba(37,211,102,0.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5vh" }}>
              <div style={{ fontSize: "1.8vw", fontWeight: 700, color: "#25D366" }}>1</div>
            </div>
            <div style={{ fontSize: "1.1vw", fontWeight: 700, color: "#1E3A5F", marginBottom: "0.8vh" }}>Mensagem</div>
            <div style={{ fontSize: "0.9vw", color: "#64748B", lineHeight: 1.4 }}>Cliente envia mensagem e recebe o menu de setores</div>
          </div>

          <div style={{ width: "3vw", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontSize: "1.5vw", color: "#CBD5E1", fontWeight: 300 }}>→</div>
          </div>

          <div style={{ background: "#FFFFFF", padding: "3vh 2vw", borderRadius: "0.8vw", border: "1px solid #E2E8F0", textAlign: "center", boxShadow: "0 4px 12px rgba(30,58,95,0.06)" }}>
            <div style={{ width: "4vw", height: "4vw", backgroundColor: "rgba(37,211,102,0.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5vh" }}>
              <div style={{ fontSize: "1.8vw", fontWeight: 700, color: "#25D366" }}>2</div>
            </div>
            <div style={{ fontSize: "1.1vw", fontWeight: 700, color: "#1E3A5F", marginBottom: "0.8vh" }}>Fila</div>
            <div style={{ fontSize: "0.9vw", color: "#64748B", lineHeight: 1.4 }}>Escolhe o setor e entra na fila automaticamente</div>
          </div>

          <div style={{ width: "3vw", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontSize: "1.5vw", color: "#CBD5E1", fontWeight: 300 }}>→</div>
          </div>

          <div style={{ background: "#FFFFFF", padding: "3vh 2vw", borderRadius: "0.8vw", border: "1px solid #E2E8F0", textAlign: "center", boxShadow: "0 4px 12px rgba(30,58,95,0.06)" }}>
            <div style={{ width: "4vw", height: "4vw", backgroundColor: "rgba(37,211,102,0.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5vh" }}>
              <div style={{ fontSize: "1.8vw", fontWeight: 700, color: "#25D366" }}>3</div>
            </div>
            <div style={{ fontSize: "1.1vw", fontWeight: 700, color: "#1E3A5F", marginBottom: "0.8vh" }}>Atendimento</div>
            <div style={{ fontSize: "0.9vw", color: "#64748B", lineHeight: 1.4 }}>Agente disponível recebe a conversa no navegador</div>
          </div>

          <div style={{ width: "3vw", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontSize: "1.5vw", color: "#CBD5E1", fontWeight: 300 }}>→</div>
          </div>

          <div style={{ background: "#1E3A5F", padding: "3vh 2vw", borderRadius: "0.8vw", textAlign: "center", boxShadow: "0 4px 12px rgba(30,58,95,0.12)" }}>
            <div style={{ width: "4vw", height: "4vw", backgroundColor: "rgba(37,211,102,0.2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5vh" }}>
              <div style={{ fontSize: "1.8vw", fontWeight: 700, color: "#25D366" }}>4</div>
            </div>
            <div style={{ fontSize: "1.1vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.8vh" }}>Avaliação</div>
            <div style={{ fontSize: "0.9vw", color: "rgba(255,255,255,0.7)", lineHeight: 1.4 }}>Pesquisa automática ao encerrar, nota de 1 a 5</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #E2E8F0", paddingTop: "2vh", fontSize: "0.85vw", color: "#94A3B8", fontWeight: 500 }}>
        <div>ZapCentral — Central Operacional Inteligente</div>
        <div>4 de 16</div>
      </div>
    </div>
  );
}
