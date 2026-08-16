export default function Slide09CRM() {
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
          <div>CRM INTEGRADO</div><div>2026</div>
        </div>
      </div>

      {/* Content */}
      <div style={{ display: "flex", flexDirection: "column", gap: "3vh" }}>
        <div>
          <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#25D366", marginBottom: "1vh", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Clientes e vendas
          </div>
          <h1 style={{ fontSize: "3.5vw", fontWeight: 800, margin: 0, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
            O histórico do cliente, no lugar certo
          </h1>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2vw", flex: 1 }}>
          <div style={{ background: "#FFFFFF", padding: "3vh 2.5vw", borderRadius: "0.8vw", border: "1px solid #E2E8F0", boxShadow: "0 4px 12px rgba(30,58,95,0.06)" }}>
            <div style={{ fontSize: "0.85vw", fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1.5vh" }}>Contatos</div>
            <div style={{ fontSize: "1.5vw", fontWeight: 700, color: "#1E3A5F", marginBottom: "1vh" }}>Cadastro automático</div>
            <div style={{ fontSize: "0.95vw", color: "#64748B", lineHeight: 1.5 }}>Cada novo cliente que entra em contato é cadastrado automaticamente com nome, telefone e histórico de atendimentos.</div>
            <div style={{ marginTop: "2vh", display: "flex", gap: "0.8vw" }}>
              <div style={{ padding: "0.5vh 1vw", backgroundColor: "#F0FDF4", borderRadius: "2vw", fontSize: "0.8vw", fontWeight: 600, color: "#16A34A" }}>Nome</div>
              <div style={{ padding: "0.5vh 1vw", backgroundColor: "#F0FDF4", borderRadius: "2vw", fontSize: "0.8vw", fontWeight: 600, color: "#16A34A" }}>Telefone</div>
              <div style={{ padding: "0.5vh 1vw", backgroundColor: "#F0FDF4", borderRadius: "2vw", fontSize: "0.8vw", fontWeight: 600, color: "#16A34A" }}>Tags</div>
            </div>
          </div>
          <div style={{ background: "#FFFFFF", padding: "3vh 2.5vw", borderRadius: "0.8vw", border: "1px solid #E2E8F0", boxShadow: "0 4px 12px rgba(30,58,95,0.06)" }}>
            <div style={{ fontSize: "0.85vw", fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1.5vh" }}>Funil de vendas</div>
            <div style={{ fontSize: "1.5vw", fontWeight: 700, color: "#1E3A5F", marginBottom: "1vh" }}>Kanban com negócios</div>
            <div style={{ fontSize: "0.95vw", color: "#64748B", lineHeight: 1.5 }}>Arraste negócios entre colunas do funil, registre valores e acompanhe em qual etapa cada oportunidade está.</div>
            <div style={{ marginTop: "2vh", display: "flex", gap: "0.5vw" }}>
              <div style={{ flex: 1, height: "0.8vh", backgroundColor: "#FEF3C7", borderRadius: "2vw" }} />
              <div style={{ flex: 2, height: "0.8vh", backgroundColor: "#FDE68A", borderRadius: "2vw" }} />
              <div style={{ flex: 1.5, height: "0.8vh", backgroundColor: "#25D366", borderRadius: "2vw" }} />
              <div style={{ flex: 0.5, height: "0.8vh", backgroundColor: "#EF4444", borderRadius: "2vw" }} />
            </div>
          </div>
          <div style={{ background: "#FFFFFF", padding: "3vh 2.5vw", borderRadius: "0.8vw", border: "1px solid #E2E8F0", boxShadow: "0 4px 12px rgba(30,58,95,0.06)" }}>
            <div style={{ fontSize: "0.85vw", fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1.5vh" }}>Segmentação</div>
            <div style={{ fontSize: "1.5vw", fontWeight: 700, color: "#1E3A5F", marginBottom: "1vh" }}>Tags por cliente e conversa</div>
            <div style={{ fontSize: "0.95vw", color: "#64748B", lineHeight: 1.5 }}>Marque clientes e conversas com tags para filtrar, segmentar e encontrar rapidamente quem você precisa contatar.</div>
          </div>
          <div style={{ background: "#1E3A5F", padding: "3vh 2.5vw", borderRadius: "0.8vw" }}>
            <div style={{ fontSize: "0.85vw", fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1.5vh" }}>Histórico</div>
            <div style={{ fontSize: "1.5vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "1vh" }}>Ficha completa do cliente</div>
            <div style={{ fontSize: "0.95vw", color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>Veja todos os atendimentos anteriores, notas e negócios de cada cliente em um único lugar, sem precisar buscar no histórico do celular.</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #E2E8F0", paddingTop: "2vh", fontSize: "0.85vw", color: "#94A3B8", fontWeight: 500 }}>
        <div>ZapCentral — Central Operacional Inteligente</div>
        <div>9 de 16</div>
      </div>
    </div>
  );
}
