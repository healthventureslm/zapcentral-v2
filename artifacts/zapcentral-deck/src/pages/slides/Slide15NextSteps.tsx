export default function Slide15NextSteps() {
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
          <div>PRÓXIMOS PASSOS</div><div>2026</div>
        </div>
      </div>

      {/* Left */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#25D366", marginBottom: "1.5vh", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Roadmap
        </div>
        <h1 style={{ fontSize: "3.5vw", fontWeight: 800, margin: "0 0 3vh 0", lineHeight: 1.1, letterSpacing: "-0.02em", textWrap: "balance" }}>
          O que vem a seguir
        </h1>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5vh", position: "relative" }}>
          <div style={{ position: "absolute", left: "0.45vw", top: "2vh", bottom: "2vh", width: "2px", backgroundColor: "#E2E8F0" }} />
          <div style={{ display: "flex", gap: "1.5vw", alignItems: "center", position: "relative", zIndex: 1 }}>
            <div style={{ width: "1vw", height: "1vw", backgroundColor: "#25D366", borderRadius: "50%", border: "3px solid #FFFFFF", boxShadow: "0 0 0 1px #E2E8F0", flexShrink: 0 }} />
            <div style={{ fontSize: "1.05vw", color: "#1E3A5F", fontWeight: 500 }}>Respostas rápidas com atalhos "/" no chat</div>
          </div>
          <div style={{ display: "flex", gap: "1.5vw", alignItems: "center", position: "relative", zIndex: 1 }}>
            <div style={{ width: "1vw", height: "1vw", backgroundColor: "#25D366", borderRadius: "50%", border: "3px solid #FFFFFF", boxShadow: "0 0 0 1px #E2E8F0", flexShrink: 0 }} />
            <div style={{ fontSize: "1.05vw", color: "#1E3A5F", fontWeight: 500 }}>Envio de imagens e arquivos pelos agentes</div>
          </div>
          <div style={{ display: "flex", gap: "1.5vw", alignItems: "center", position: "relative", zIndex: 1 }}>
            <div style={{ width: "1vw", height: "1vw", backgroundColor: "#25D366", borderRadius: "50%", border: "3px solid #FFFFFF", boxShadow: "0 0 0 1px #E2E8F0", flexShrink: 0 }} />
            <div style={{ fontSize: "1.05vw", color: "#1E3A5F", fontWeight: 500 }}>Vários números de WhatsApp, um por setor</div>
          </div>
          <div style={{ display: "flex", gap: "1.5vw", alignItems: "center", position: "relative", zIndex: 1 }}>
            <div style={{ width: "1vw", height: "1vw", backgroundColor: "#25D366", borderRadius: "50%", border: "3px solid #FFFFFF", boxShadow: "0 0 0 1px #E2E8F0", flexShrink: 0 }} />
            <div style={{ fontSize: "1.05vw", color: "#1E3A5F", fontWeight: 500 }}>Horário de atendimento por setor com mensagem fora do expediente</div>
          </div>
          <div style={{ display: "flex", gap: "1.5vw", alignItems: "center", position: "relative", zIndex: 1 }}>
            <div style={{ width: "1vw", height: "1vw", backgroundColor: "#94A3B8", borderRadius: "50%", border: "3px solid #FFFFFF", boxShadow: "0 0 0 1px #E2E8F0", flexShrink: 0 }} />
            <div style={{ fontSize: "1.05vw", color: "#64748B", fontWeight: 500 }}>Resumo semanal automático por e-mail</div>
          </div>
        </div>
      </div>

      {/* Right */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "2vh" }}>
        <div style={{ background: "#FFFFFF", padding: "3vh 2.5vw", borderRadius: "0.8vw", border: "1px solid #E2E8F0", boxShadow: "0 4px 12px rgba(30,58,95,0.06)" }}>
          <div style={{ fontSize: "1vw", fontWeight: 600, color: "#64748B", marginBottom: "2vh", textTransform: "uppercase" }}>Já disponível</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5vh 1.5vw" }}>
            <div style={{ fontSize: "0.9vw", color: "#25D366", display: "flex", alignItems: "center", gap: "0.5vw" }}>
              <span style={{ fontWeight: 700 }}>✓</span> URA e filas
            </div>
            <div style={{ fontSize: "0.9vw", color: "#25D366", display: "flex", alignItems: "center", gap: "0.5vw" }}>
              <span style={{ fontWeight: 700 }}>✓</span> Multi-setor
            </div>
            <div style={{ fontSize: "0.9vw", color: "#25D366", display: "flex", alignItems: "center", gap: "0.5vw" }}>
              <span style={{ fontWeight: 700 }}>✓</span> CRM integrado
            </div>
            <div style={{ fontSize: "0.9vw", color: "#25D366", display: "flex", alignItems: "center", gap: "0.5vw" }}>
              <span style={{ fontWeight: 700 }}>✓</span> Chat interno
            </div>
            <div style={{ fontSize: "0.9vw", color: "#25D366", display: "flex", alignItems: "center", gap: "0.5vw" }}>
              <span style={{ fontWeight: 700 }}>✓</span> Relatórios
            </div>
            <div style={{ fontSize: "0.9vw", color: "#25D366", display: "flex", alignItems: "center", gap: "0.5vw" }}>
              <span style={{ fontWeight: 700 }}>✓</span> Pesquisa 1–5
            </div>
            <div style={{ fontSize: "0.9vw", color: "#25D366", display: "flex", alignItems: "center", gap: "0.5vw" }}>
              <span style={{ fontWeight: 700 }}>✓</span> Ranking agentes
            </div>
            <div style={{ fontSize: "0.9vw", color: "#25D366", display: "flex", alignItems: "center", gap: "0.5vw" }}>
              <span style={{ fontWeight: 700 }}>✓</span> Segurança multi-tenant
            </div>
          </div>
        </div>
        <div style={{ background: "#1E3A5F", padding: "2.5vh 2.5vw", borderRadius: "0.8vw", textAlign: "center" }}>
          <div style={{ fontSize: "1.5vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.8vh" }}>Plataforma em produção</div>
          <div style={{ fontSize: "0.95vw", color: "rgba(255,255,255,0.65)" }}>Pronto para conectar seu WhatsApp hoje</div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #E2E8F0", paddingTop: "2vh", fontSize: "0.85vw", color: "#94A3B8", fontWeight: 500 }}>
        <div>ZapCentral — Central Operacional Inteligente</div>
        <div>15 de 16</div>
      </div>
    </div>
  );
}
