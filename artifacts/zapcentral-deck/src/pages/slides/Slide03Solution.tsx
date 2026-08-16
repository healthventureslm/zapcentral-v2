export default function Slide03Solution() {
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
          <div>A SOLUÇÃO</div><div>2026</div>
        </div>
      </div>

      {/* Left */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#25D366", marginBottom: "1.5vh", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Um PABX para o WhatsApp
        </div>
        <h1 style={{ fontSize: "3.6vw", fontWeight: 800, margin: "0 0 3vh 0", lineHeight: 1.1, letterSpacing: "-0.02em", textWrap: "balance" }}>
          Toda a equipe, um único número
        </h1>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5vh" }}>
          <div style={{ display: "flex", gap: "1vw", alignItems: "flex-start", background: "#F0FDF4", padding: "1.6vh 1.5vw", borderRadius: "0.6vw", border: "1px solid #BBF7D0" }}>
            <div style={{ fontSize: "1vw", fontWeight: 700, color: "#25D366", width: "1.5vw", flexShrink: 0, marginTop: "0.1vh" }}>✓</div>
            <div style={{ fontSize: "1.05vw", fontWeight: 500, color: "#1E3A5F" }}>Menu de autoatendimento (URA) direciona ao setor certo</div>
          </div>
          <div style={{ display: "flex", gap: "1vw", alignItems: "flex-start", background: "#F0FDF4", padding: "1.6vh 1.5vw", borderRadius: "0.6vw", border: "1px solid #BBF7D0" }}>
            <div style={{ fontSize: "1vw", fontWeight: 700, color: "#25D366", width: "1.5vw", flexShrink: 0, marginTop: "0.1vh" }}>✓</div>
            <div style={{ fontSize: "1.05vw", fontWeight: 500, color: "#1E3A5F" }}>Fila por setor com distribuição automática entre agentes</div>
          </div>
          <div style={{ display: "flex", gap: "1vw", alignItems: "flex-start", background: "#F0FDF4", padding: "1.6vh 1.5vw", borderRadius: "0.6vw", border: "1px solid #BBF7D0" }}>
            <div style={{ fontSize: "1vw", fontWeight: 700, color: "#25D366", width: "1.5vw", flexShrink: 0, marginTop: "0.1vh" }}>✓</div>
            <div style={{ fontSize: "1.05vw", fontWeight: 500, color: "#1E3A5F" }}>Toda a equipe atende pelo navegador, um único número</div>
          </div>
          <div style={{ display: "flex", gap: "1vw", alignItems: "flex-start", background: "#F0FDF4", padding: "1.6vh 1.5vw", borderRadius: "0.6vw", border: "1px solid #BBF7D0" }}>
            <div style={{ fontSize: "1vw", fontWeight: 700, color: "#25D366", width: "1.5vw", flexShrink: 0, marginTop: "0.1vh" }}>✓</div>
            <div style={{ fontSize: "1.05vw", fontWeight: 500, color: "#1E3A5F" }}>Histórico completo de cada cliente em um só lugar</div>
          </div>
        </div>
      </div>

      {/* Right */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ background: "#FFFFFF", padding: "3vh 2.5vw", borderRadius: "0.8vw", border: "1px solid #E2E8F0", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", gap: "2vh", boxSizing: "border-box", boxShadow: "0 4px 12px rgba(30,58,95,0.06)" }}>
          <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#1E3A5F", borderBottom: "1px solid #E2E8F0", paddingBottom: "1.5vh" }}>
            Fluxo ZapCentral
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "2vh" }}>
            <div style={{ display: "flex", gap: "1.5vw", alignItems: "center" }}>
              <div style={{ fontSize: "1.1vw", fontWeight: 700, color: "#FFFFFF", backgroundColor: "#25D366", width: "2.5vw", height: "2.5vw", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", flexShrink: 0 }}>1</div>
              <div>
                <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#1E3A5F" }}>Cliente envia mensagem</div>
                <div style={{ fontSize: "0.9vw", color: "#64748B" }}>Recebe menu de opções automaticamente</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "1.5vw", alignItems: "center" }}>
              <div style={{ fontSize: "1.1vw", fontWeight: 700, color: "#FFFFFF", backgroundColor: "#25D366", width: "2.5vw", height: "2.5vw", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", flexShrink: 0 }}>2</div>
              <div>
                <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#1E3A5F" }}>Escolhe o setor</div>
                <div style={{ fontSize: "0.9vw", color: "#64748B" }}>Entra na fila do departamento correto</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "1.5vw", alignItems: "center" }}>
              <div style={{ fontSize: "1.1vw", fontWeight: 700, color: "#FFFFFF", backgroundColor: "#25D366", width: "2.5vw", height: "2.5vw", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", flexShrink: 0 }}>3</div>
              <div>
                <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#1E3A5F" }}>Agente recebe automaticamente</div>
                <div style={{ fontSize: "0.9vw", color: "#64748B" }}>Respeitando capacidade de cada agente</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "1.5vw", alignItems: "center" }}>
              <div style={{ fontSize: "1.1vw", fontWeight: 700, color: "#FFFFFF", backgroundColor: "#1E3A5F", width: "2.5vw", height: "2.5vw", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", flexShrink: 0 }}>4</div>
              <div>
                <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#1E3A5F" }}>Avaliação ao encerrar</div>
                <div style={{ fontSize: "0.9vw", color: "#64748B" }}>Pesquisa automática de 1 a 5</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #E2E8F0", paddingTop: "2vh", fontSize: "0.85vw", color: "#94A3B8", fontWeight: 500 }}>
        <div>ZapCentral — Central Operacional Inteligente</div>
        <div>3 de 16</div>
      </div>
    </div>
  );
}
