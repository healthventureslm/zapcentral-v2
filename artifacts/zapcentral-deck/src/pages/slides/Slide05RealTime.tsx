export default function Slide05RealTime() {
  return (
    <div style={{
      width: "100vw", height: "100vh", overflow: "hidden", backgroundColor: "#FAFBFC",
      fontFamily: "'Inter', sans-serif", padding: "4vh 4vw", boxSizing: "border-box",
      display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "auto 1fr auto",
      gap: "3vh 4vw", color: "#1E3A5F"
    }}>
      {/* Header */}
      <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E2E8F0", paddingBottom: "2vh" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.8vw" }}>
          <div style={{ width: "2vw", height: "2vw", backgroundColor: "#25D366", borderRadius: "0.4vw" }} />
          <div style={{ fontSize: "1.2vw", fontWeight: 700 }}>ZapCentral</div>
        </div>
        <div style={{ display: "flex", gap: "2vw", fontSize: "1vw", fontWeight: 500, color: "#64748B" }}>
          <div>ATENDIMENTO EM TEMPO REAL</div><div>2026</div>
        </div>
      </div>

      {/* Left */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#25D366", marginBottom: "1.5vh", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Painel ao vivo
        </div>
        <h1 style={{ fontSize: "3.5vw", fontWeight: 800, margin: "0 0 2.5vh 0", lineHeight: 1.1, letterSpacing: "-0.02em", textWrap: "balance" }}>
          Visibilidade total do que acontece agora
        </h1>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5vh" }}>
          <div style={{ display: "flex", gap: "1vw", alignItems: "flex-start" }}>
            <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", backgroundColor: "#25D366", flexShrink: 0, marginTop: "0.7vh" }} />
            <div style={{ fontSize: "1.05vw", color: "#475569", lineHeight: 1.4 }}>Painel de conversas com atualização instantânea via WebSocket</div>
          </div>
          <div style={{ display: "flex", gap: "1vw", alignItems: "flex-start" }}>
            <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", backgroundColor: "#25D366", flexShrink: 0, marginTop: "0.7vh" }} />
            <div style={{ fontSize: "1.05vw", color: "#475569", lineHeight: 1.4 }}>Atribuição automática respeitando a capacidade de cada agente</div>
          </div>
          <div style={{ display: "flex", gap: "1vw", alignItems: "flex-start" }}>
            <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", backgroundColor: "#25D366", flexShrink: 0, marginTop: "0.7vh" }} />
            <div style={{ fontSize: "1.05vw", color: "#475569", lineHeight: 1.4 }}>Notas de encerramento e mensagens automáticas de fechamento</div>
          </div>
          <div style={{ display: "flex", gap: "1vw", alignItems: "flex-start" }}>
            <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", backgroundColor: "#25D366", flexShrink: 0, marginTop: "0.7vh" }} />
            <div style={{ fontSize: "1.05vw", color: "#475569", lineHeight: 1.4 }}>Pesquisa de satisfação enviada automaticamente ao fechar</div>
          </div>
        </div>
      </div>

      {/* Right — live metrics mockup */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "1.5vh" }}>
        <div style={{ background: "#FFFFFF", padding: "2.5vh 2vw", borderRadius: "0.8vw", border: "1px solid #E2E8F0", boxShadow: "0 4px 12px rgba(30,58,95,0.06)" }}>
          <div style={{ fontSize: "0.85vw", fontWeight: 600, color: "#64748B", marginBottom: "1.5vh", textTransform: "uppercase" }}>Ao vivo agora</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5vw" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "3vw", fontWeight: 700, color: "#25D366" }}>12</div>
              <div style={{ fontSize: "0.8vw", color: "#64748B" }}>Em atendimento</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "3vw", fontWeight: 700, color: "#F59E0B" }}>5</div>
              <div style={{ fontSize: "0.8vw", color: "#64748B" }}>Aguardando</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "3vw", fontWeight: 700, color: "#1E3A5F" }}>48</div>
              <div style={{ fontSize: "0.8vw", color: "#64748B" }}>Encerrados hoje</div>
            </div>
          </div>
        </div>
        <div style={{ background: "#FFFFFF", padding: "2.5vh 2vw", borderRadius: "0.8vw", border: "1px solid #E2E8F0", boxShadow: "0 4px 12px rgba(30,58,95,0.06)" }}>
          <div style={{ fontSize: "0.85vw", fontWeight: 600, color: "#64748B", marginBottom: "1.5vh", textTransform: "uppercase" }}>Agentes online</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.2vh" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.8vw" }}>
                <div style={{ width: "1.5vw", height: "1.5vw", borderRadius: "50%", backgroundColor: "#DBEAFE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7vw", fontWeight: 700, color: "#1E3A5F" }}>MA</div>
                <div style={{ fontSize: "0.95vw", color: "#1E3A5F" }}>Maria</div>
              </div>
              <div style={{ fontSize: "0.85vw", color: "#64748B" }}>3 conversas</div>
              <div style={{ width: "0.7vw", height: "0.7vw", borderRadius: "50%", backgroundColor: "#25D366" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.8vw" }}>
                <div style={{ width: "1.5vw", height: "1.5vw", borderRadius: "50%", backgroundColor: "#DBEAFE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7vw", fontWeight: 700, color: "#1E3A5F" }}>JO</div>
                <div style={{ fontSize: "0.95vw", color: "#1E3A5F" }}>João</div>
              </div>
              <div style={{ fontSize: "0.85vw", color: "#64748B" }}>2 conversas</div>
              <div style={{ width: "0.7vw", height: "0.7vw", borderRadius: "50%", backgroundColor: "#25D366" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.8vw" }}>
                <div style={{ width: "1.5vw", height: "1.5vw", borderRadius: "50%", backgroundColor: "#DBEAFE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7vw", fontWeight: 700, color: "#1E3A5F" }}>AN</div>
                <div style={{ fontSize: "0.95vw", color: "#1E3A5F" }}>Ana</div>
              </div>
              <div style={{ fontSize: "0.85vw", color: "#64748B" }}>4 conversas</div>
              <div style={{ width: "0.7vw", height: "0.7vw", borderRadius: "50%", backgroundColor: "#F59E0B" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #E2E8F0", paddingTop: "2vh", fontSize: "0.85vw", color: "#94A3B8", fontWeight: 500 }}>
        <div>ZapCentral — Central Operacional Inteligente</div>
        <div>5 de 16</div>
      </div>
    </div>
  );
}
