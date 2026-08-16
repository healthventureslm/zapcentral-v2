export default function Slide12Ranking() {
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
          <div>RANKING DE AGENTES</div><div>2026</div>
        </div>
      </div>

      {/* Content */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2.5vh" }}>
        <div>
          <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#25D366", marginBottom: "1vh", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Desempenho individual
          </div>
          <h1 style={{ fontSize: "3.5vw", fontWeight: 800, margin: 0, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
            Quem atende bem fica visível
          </h1>
        </div>

        {/* Table */}
        <div style={{ background: "#FFFFFF", borderRadius: "0.8vw", border: "1px solid #E2E8F0", boxShadow: "0 4px 12px rgba(30,58,95,0.06)", overflow: "hidden", flex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2.5rem 1fr 1fr 1fr 1fr 1fr", gap: 0, backgroundColor: "#F8FAFC", padding: "1.5vh 2vw", borderBottom: "1px solid #E2E8F0" }}>
            <div style={{ fontSize: "0.8vw", fontWeight: 600, color: "#64748B", textTransform: "uppercase" }}>#</div>
            <div style={{ fontSize: "0.8vw", fontWeight: 600, color: "#64748B", textTransform: "uppercase" }}>Agente</div>
            <div style={{ fontSize: "0.8vw", fontWeight: 600, color: "#64748B", textTransform: "uppercase", textAlign: "center" }}>Atendidos</div>
            <div style={{ fontSize: "0.8vw", fontWeight: 600, color: "#64748B", textTransform: "uppercase", textAlign: "center" }}>Resolvidos</div>
            <div style={{ fontSize: "0.8vw", fontWeight: 600, color: "#64748B", textTransform: "uppercase", textAlign: "center" }}>T.M. 1ª Resp.</div>
            <div style={{ fontSize: "0.8vw", fontWeight: 600, color: "#64748B", textTransform: "uppercase", textAlign: "center" }}>Satisfação</div>
          </div>

          <div style={{ padding: "1.2vh 2vw", borderBottom: "1px solid #F1F5F9", display: "grid", gridTemplateColumns: "2.5rem 1fr 1fr 1fr 1fr 1fr", alignItems: "center" }}>
            <div style={{ fontSize: "1vw", fontWeight: 700, color: "#F59E0B" }}>1°</div>
            <div style={{ fontSize: "1vw", fontWeight: 600, color: "#1E3A5F" }}>Maria S.</div>
            <div style={{ fontSize: "1vw", color: "#475569", textAlign: "center" }}>87</div>
            <div style={{ fontSize: "1vw", color: "#475569", textAlign: "center" }}>84</div>
            <div style={{ fontSize: "1vw", color: "#475569", textAlign: "center" }}>3m 12s</div>
            <div style={{ textAlign: "center" }}>
              <span style={{ fontSize: "0.9vw", fontWeight: 600, color: "#25D366", backgroundColor: "rgba(37,211,102,0.1)", padding: "0.4vh 0.8vw", borderRadius: "2vw" }}>4.9</span>
            </div>
          </div>

          <div style={{ padding: "1.2vh 2vw", borderBottom: "1px solid #F1F5F9", display: "grid", gridTemplateColumns: "2.5rem 1fr 1fr 1fr 1fr 1fr", alignItems: "center" }}>
            <div style={{ fontSize: "1vw", fontWeight: 700, color: "#94A3B8" }}>2°</div>
            <div style={{ fontSize: "1vw", fontWeight: 600, color: "#1E3A5F" }}>João P.</div>
            <div style={{ fontSize: "1vw", color: "#475569", textAlign: "center" }}>72</div>
            <div style={{ fontSize: "1vw", color: "#475569", textAlign: "center" }}>70</div>
            <div style={{ fontSize: "1vw", color: "#475569", textAlign: "center" }}>4m 45s</div>
            <div style={{ textAlign: "center" }}>
              <span style={{ fontSize: "0.9vw", fontWeight: 600, color: "#25D366", backgroundColor: "rgba(37,211,102,0.1)", padding: "0.4vh 0.8vw", borderRadius: "2vw" }}>4.7</span>
            </div>
          </div>

          <div style={{ padding: "1.2vh 2vw", borderBottom: "1px solid #F1F5F9", display: "grid", gridTemplateColumns: "2.5rem 1fr 1fr 1fr 1fr 1fr", alignItems: "center" }}>
            <div style={{ fontSize: "1vw", fontWeight: 700, color: "#CD7F32" }}>3°</div>
            <div style={{ fontSize: "1vw", fontWeight: 600, color: "#1E3A5F" }}>Ana L.</div>
            <div style={{ fontSize: "1vw", color: "#475569", textAlign: "center" }}>65</div>
            <div style={{ fontSize: "1vw", color: "#475569", textAlign: "center" }}>61</div>
            <div style={{ fontSize: "1vw", color: "#475569", textAlign: "center" }}>6m 30s</div>
            <div style={{ textAlign: "center" }}>
              <span style={{ fontSize: "0.9vw", fontWeight: 600, color: "#F59E0B", backgroundColor: "rgba(245,158,11,0.1)", padding: "0.4vh 0.8vw", borderRadius: "2vw" }}>4.2</span>
            </div>
          </div>

          <div style={{ padding: "1.2vh 2vw", display: "grid", gridTemplateColumns: "2.5rem 1fr 1fr 1fr 1fr 1fr", alignItems: "center" }}>
            <div style={{ fontSize: "1vw", fontWeight: 700, color: "#94A3B8" }}>4°</div>
            <div style={{ fontSize: "1vw", fontWeight: 600, color: "#1E3A5F" }}>Carlos M.</div>
            <div style={{ fontSize: "1vw", color: "#475569", textAlign: "center" }}>58</div>
            <div style={{ fontSize: "1vw", color: "#475569", textAlign: "center" }}>52</div>
            <div style={{ fontSize: "1vw", color: "#475569", textAlign: "center" }}>8m 20s</div>
            <div style={{ textAlign: "center" }}>
              <span style={{ fontSize: "0.9vw", fontWeight: 600, color: "#94A3B8", backgroundColor: "#F1F5F9", padding: "0.4vh 0.8vw", borderRadius: "2vw" }}>3.8</span>
            </div>
          </div>
        </div>

        <div style={{ background: "#F0FDF4", padding: "1.8vh 2vw", borderRadius: "0.6vw", border: "1px solid #BBF7D0", fontSize: "0.95vw", color: "#166534" }}>
          Somente mensagens de agentes humanos contam no ranking — automação e IVR nunca inflam os resultados.
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #E2E8F0", paddingTop: "2vh", fontSize: "0.85vw", color: "#94A3B8", fontWeight: 500 }}>
        <div>ZapCentral — Central Operacional Inteligente</div>
        <div>12 de 16</div>
      </div>
    </div>
  );
}
