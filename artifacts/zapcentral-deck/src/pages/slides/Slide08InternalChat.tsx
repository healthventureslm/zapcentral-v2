export default function Slide08InternalChat() {
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
          <div>CHAT INTERNO DA EQUIPE</div><div>2026</div>
        </div>
      </div>

      {/* Left */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#25D366", marginBottom: "1.5vh", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Comunicação interna
        </div>
        <h1 style={{ fontSize: "3.5vw", fontWeight: 800, margin: "0 0 2.5vh 0", lineHeight: 1.1, letterSpacing: "-0.02em", textWrap: "balance" }}>
          A equipe conversa sem sair da plataforma
        </h1>
        <div style={{ display: "flex", flexDirection: "column", gap: "2vh" }}>
          <div style={{ display: "flex", gap: "1.5vw", alignItems: "flex-start", background: "#FFFFFF", padding: "2vh 1.8vw", borderRadius: "0.8vw", border: "1px solid #E2E8F0", boxShadow: "0 2px 8px rgba(30,58,95,0.04)" }}>
            <div style={{ width: "2.5vw", height: "2.5vw", backgroundColor: "rgba(37,211,102,0.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ fontSize: "1.2vw", fontWeight: 700, color: "#25D366" }}>1:1</div>
            </div>
            <div>
              <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#1E3A5F", marginBottom: "0.4vh" }}>Conversa direta entre colegas</div>
              <div style={{ fontSize: "0.9vw", color: "#64748B" }}>Sem precisar sair do ZapCentral ou trocar de app</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "1.5vw", alignItems: "flex-start", background: "#FFFFFF", padding: "2vh 1.8vw", borderRadius: "0.8vw", border: "1px solid #E2E8F0", boxShadow: "0 2px 8px rgba(30,58,95,0.04)" }}>
            <div style={{ width: "2.5vw", height: "2.5vw", backgroundColor: "rgba(37,211,102,0.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ fontSize: "1.2vw", fontWeight: 700, color: "#25D366" }}>!</div>
            </div>
            <div>
              <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#1E3A5F", marginBottom: "0.4vh" }}>Notificações com contador de não lidas</div>
              <div style={{ fontSize: "0.9vw", color: "#64748B" }}>Aviso sonoro quando fora da tela de equipe</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "1.5vw", alignItems: "flex-start", background: "#FFFFFF", padding: "2vh 1.8vw", borderRadius: "0.8vw", border: "1px solid #E2E8F0", boxShadow: "0 2px 8px rgba(30,58,95,0.04)" }}>
            <div style={{ width: "2.5vw", height: "2.5vw", backgroundColor: "rgba(37,211,102,0.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ fontSize: "1.2vw", fontWeight: 700, color: "#25D366" }}>🔒</div>
            </div>
            <div>
              <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#1E3A5F", marginBottom: "0.4vh" }}>Isolado por central</div>
              <div style={{ fontSize: "0.9vw", color: "#64748B" }}>Mensagens nunca vazam entre empresas diferentes</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right — chat preview */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ background: "#FFFFFF", borderRadius: "0.8vw", border: "1px solid #E2E8F0", overflow: "hidden", height: "100%", display: "flex", flexDirection: "column", boxShadow: "0 4px 12px rgba(30,58,95,0.06)" }}>
          <div style={{ padding: "1.5vh 1.5vw", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: "0.8vw", backgroundColor: "#F8FAFC" }}>
            <div style={{ width: "2vw", height: "2vw", borderRadius: "50%", backgroundColor: "#DBEAFE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8vw", fontWeight: 700, color: "#1E3A5F" }}>MA</div>
            <div>
              <div style={{ fontSize: "0.95vw", fontWeight: 600, color: "#1E3A5F" }}>Maria</div>
              <div style={{ fontSize: "0.75vw", color: "#25D366" }}>online</div>
            </div>
          </div>
          <div style={{ flex: 1, padding: "2vh 1.5vw", display: "flex", flexDirection: "column", gap: "1.5vh", justifyContent: "flex-end" }}>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <div style={{ background: "#25D366", color: "#FFFFFF", padding: "1vh 1.2vw", borderRadius: "1vw 1vw 0.2vw 1vw", fontSize: "0.9vw", maxWidth: "70%" }}>
                João, o cliente da conversa #234 pediu transferência pro financeiro
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{ background: "#F1F5F9", color: "#1E3A5F", padding: "1vh 1.2vw", borderRadius: "1vw 1vw 1vw 0.2vw", fontSize: "0.9vw", maxWidth: "70%" }}>
                Ok! Vou assumir agora
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <div style={{ background: "#25D366", color: "#FFFFFF", padding: "1vh 1.2vw", borderRadius: "1vw 1vw 0.2vw 1vw", fontSize: "0.9vw", maxWidth: "70%" }}>
                Obrigada!
              </div>
            </div>
          </div>
          <div style={{ padding: "1.5vh 1.5vw", borderTop: "1px solid #E2E8F0", display: "flex", gap: "0.8vw" }}>
            <div style={{ flex: 1, background: "#F8FAFC", borderRadius: "2vw", padding: "1vh 1.2vw", fontSize: "0.85vw", color: "#94A3B8", border: "1px solid #E2E8F0" }}>
              Escreva uma mensagem...
            </div>
            <div style={{ width: "2.5vw", height: "2.5vw", backgroundColor: "#25D366", borderRadius: "50%", flexShrink: 0 }} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #E2E8F0", paddingTop: "2vh", fontSize: "0.85vw", color: "#94A3B8", fontWeight: 500 }}>
        <div>ZapCentral — Central Operacional Inteligente</div>
        <div>8 de 16</div>
      </div>
    </div>
  );
}
