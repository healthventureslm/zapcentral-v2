export default function Slide10Survey() {
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
          <div>PESQUISA DE SATISFAÇÃO</div><div>2026</div>
        </div>
      </div>

      {/* Left */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#25D366", marginBottom: "1.5vh", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Avaliação automática
        </div>
        <h1 style={{ fontSize: "3.5vw", fontWeight: 800, margin: "0 0 2.5vh 0", lineHeight: 1.1, letterSpacing: "-0.02em", textWrap: "balance" }}>
          Nota do cliente, sem complicar a fila
        </h1>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5vh" }}>
          <div style={{ display: "flex", gap: "1vw", alignItems: "flex-start" }}>
            <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", backgroundColor: "#25D366", flexShrink: 0, marginTop: "0.7vh" }} />
            <div style={{ fontSize: "1.05vw", color: "#475569", lineHeight: 1.4 }}>Ao encerrar, cliente recebe: "Avalie nosso atendimento de 1 a 5"</div>
          </div>
          <div style={{ display: "flex", gap: "1vw", alignItems: "flex-start" }}>
            <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", backgroundColor: "#25D366", flexShrink: 0, marginTop: "0.7vh" }} />
            <div style={{ fontSize: "1.05vw", color: "#475569", lineHeight: 1.4 }}>Nota e comentário registrados automaticamente na conversa</div>
          </div>
          <div style={{ display: "flex", gap: "1vw", alignItems: "flex-start" }}>
            <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", backgroundColor: "#25D366", flexShrink: 0, marginTop: "0.7vh" }} />
            <div style={{ fontSize: "1.05vw", color: "#475569", lineHeight: 1.4 }}>Quem não responde não trava nada — próxima mensagem abre novo atendimento</div>
          </div>
          <div style={{ display: "flex", gap: "1vw", alignItems: "flex-start" }}>
            <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", backgroundColor: "#25D366", flexShrink: 0, marginTop: "0.7vh" }} />
            <div style={{ fontSize: "1.05vw", color: "#475569", lineHeight: 1.4 }}>Proteção contra confusão com respostas do menu IVR</div>
          </div>
        </div>
      </div>

      {/* Right — WhatsApp survey mockup */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ background: "#ECE5DD", borderRadius: "0.8vw", overflow: "hidden", height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
          <div style={{ padding: "1.5vh 1.5vw", backgroundColor: "#128C7E", display: "flex", alignItems: "center", gap: "0.8vw" }}>
            <div style={{ width: "2vw", height: "2vw", borderRadius: "50%", backgroundColor: "#25D366", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8vw", fontWeight: 700, color: "#FFFFFF" }}>ZC</div>
            <div>
              <div style={{ fontSize: "0.95vw", fontWeight: 600, color: "#FFFFFF" }}>ZapCentral</div>
              <div style={{ fontSize: "0.75vw", color: "rgba(255,255,255,0.7)" }}>Pesquisa de satisfação</div>
            </div>
          </div>
          <div style={{ flex: 1, padding: "2vh 1.5vw", display: "flex", flexDirection: "column", gap: "1.5vh", justifyContent: "center" }}>
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{ background: "#FFFFFF", color: "#1E3A5F", padding: "1.2vh 1.5vw", borderRadius: "0.2vw 1vw 1vw 1vw", fontSize: "0.9vw", maxWidth: "80%", lineHeight: 1.5, boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
                Como você avalia nosso atendimento? Responda com uma nota de 1 a 5 (5 = excelente). Se quiser, escreva um comentário.
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <div style={{ background: "#DCF8C6", color: "#1E3A5F", padding: "1.2vh 1.5vw", borderRadius: "1vw 0.2vw 1vw 1vw", fontSize: "0.9vw", maxWidth: "50%", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
                5 Ótimo atendimento!
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{ background: "#FFFFFF", color: "#1E3A5F", padding: "1.2vh 1.5vw", borderRadius: "0.2vw 1vw 1vw 1vw", fontSize: "0.9vw", maxWidth: "80%", lineHeight: 1.5, boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
                Obrigado pela sua avaliação!
              </div>
            </div>
          </div>
          <div style={{ padding: "1vh 1.5vw", backgroundColor: "#F0F0F0", display: "flex", gap: "0.8vw", alignItems: "center" }}>
            <div style={{ flex: 1, background: "#FFFFFF", borderRadius: "2vw", padding: "0.8vh 1.2vw", fontSize: "0.8vw", color: "#94A3B8" }}>Mensagem</div>
            <div style={{ width: "2.2vw", height: "2.2vw", backgroundColor: "#128C7E", borderRadius: "50%" }} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #E2E8F0", paddingTop: "2vh", fontSize: "0.85vw", color: "#94A3B8", fontWeight: 500 }}>
        <div>ZapCentral — Central Operacional Inteligente</div>
        <div>10 de 16</div>
      </div>
    </div>
  );
}
