export default function Slide02Problem() {
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
          <div>O PROBLEMA</div><div>2026</div>
        </div>
      </div>

      {/* Left */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#EF4444", marginBottom: "1.5vh", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          O cenário atual
        </div>
        <h1 style={{ fontSize: "3.8vw", fontWeight: 800, margin: "0 0 3vh 0", lineHeight: 1.1, letterSpacing: "-0.02em", textWrap: "balance" }}>
          Caos no atendimento via WhatsApp
        </h1>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5vh" }}>
          <div style={{ background: "#FEF2F2", padding: "1.8vh 1.5vw", borderRadius: "0.6vw", border: "1px solid #FECACA" }}>
            <div style={{ fontSize: "1.05vw", fontWeight: 500, color: "#1E3A5F" }}>Um número, vários atendentes disputando o celular</div>
          </div>
          <div style={{ background: "#FEF2F2", padding: "1.8vh 1.5vw", borderRadius: "0.6vw", border: "1px solid #FECACA" }}>
            <div style={{ fontSize: "1.05vw", fontWeight: 500, color: "#1E3A5F" }}>Clientes caem com a pessoa errada sem direcionamento</div>
          </div>
          <div style={{ background: "#FEF2F2", padding: "1.8vh 1.5vw", borderRadius: "0.6vw", border: "1px solid #FECACA" }}>
            <div style={{ fontSize: "1.05vw", fontWeight: 500, color: "#1E3A5F" }}>Nenhum histórico, métrica ou controle de atendimentos</div>
          </div>
          <div style={{ background: "#FEF2F2", padding: "1.8vh 1.5vw", borderRadius: "0.6vw", border: "1px solid #FECACA" }}>
            <div style={{ fontSize: "1.05vw", fontWeight: 500, color: "#1E3A5F" }}>Oportunidades de venda se perdem na conversa</div>
          </div>
        </div>
      </div>

      {/* Right — visual */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "1.5vh" }}>
        <div style={{ background: "#FFFFFF", padding: "3vh 2.5vw", borderRadius: "0.8vw", border: "1px solid #E2E8F0", boxShadow: "0 4px 12px rgba(30,58,95,0.06)" }}>
          <div style={{ fontSize: "1vw", fontWeight: 600, color: "#64748B", marginBottom: "2vh", textTransform: "uppercase" }}>Cenário sem solução</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.2vh" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1vw" }}>
              <div style={{ width: "0.8vw", height: "0.8vw", borderRadius: "50%", backgroundColor: "#EF4444", flexShrink: 0 }} />
              <div style={{ fontSize: "1vw", color: "#64748B" }}>Agente A responde e agente B responde a mesma conversa</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1vw" }}>
              <div style={{ width: "0.8vw", height: "0.8vw", borderRadius: "50%", backgroundColor: "#EF4444", flexShrink: 0 }} />
              <div style={{ fontSize: "1vw", color: "#64748B" }}>Mensagens sem resposta por horas ou dias</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1vw" }}>
              <div style={{ width: "0.8vw", height: "0.8vw", borderRadius: "50%", backgroundColor: "#EF4444", flexShrink: 0 }} />
              <div style={{ fontSize: "1vw", color: "#64748B" }}>Gestor não sabe quem atendeu o quê</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1vw" }}>
              <div style={{ width: "0.8vw", height: "0.8vw", borderRadius: "50%", backgroundColor: "#EF4444", flexShrink: 0 }} />
              <div style={{ fontSize: "1vw", color: "#64748B" }}>Sem relatório, sem métrica, sem melhoria</div>
            </div>
          </div>
        </div>
        <div style={{ background: "#1E3A5F", padding: "2.5vh 2.5vw", borderRadius: "0.8vw", textAlign: "center" }}>
          <div style={{ fontSize: "3.5vw", fontWeight: 800, color: "#FFFFFF", lineHeight: 1.1 }}>Resultado</div>
          <div style={{ fontSize: "1.1vw", color: "rgba(255,255,255,0.7)", marginTop: "1vh" }}>Cliente insatisfeito. Venda perdida.</div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #E2E8F0", paddingTop: "2vh", fontSize: "0.85vw", color: "#94A3B8", fontWeight: 500 }}>
        <div>ZapCentral — Central Operacional Inteligente</div>
        <div>2 de 16</div>
      </div>
    </div>
  );
}
