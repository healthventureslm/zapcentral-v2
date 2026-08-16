const base = import.meta.env.BASE_URL;

export default function Slide16Closing() {
  return (
    <div style={{
      width: "100vw", height: "100vh", overflow: "hidden", backgroundColor: "#0F1923",
      fontFamily: "'Inter', sans-serif", padding: "4vh 4vw", boxSizing: "border-box",
      display: "grid", gridTemplateColumns: "1fr", gridTemplateRows: "auto 1fr auto",
      gap: "3vh", color: "#FFFFFF", position: "relative"
    }}>
      {/* Background image overlay */}
      <img
        src={`${base}closing-bg.png`}
        crossOrigin="anonymous"
        alt=""
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.12 }}
      />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "2vh", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.8vw" }}>
          <div style={{ width: "2vw", height: "2vw", backgroundColor: "#25D366", borderRadius: "0.4vw" }} />
          <div style={{ fontSize: "1.2vw", fontWeight: 700, color: "#FFFFFF" }}>ZapCentral</div>
        </div>
        <div style={{ fontSize: "1vw", fontWeight: 500, color: "rgba(255,255,255,0.4)" }}>2026</div>
      </div>

      {/* Main content */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", position: "relative", zIndex: 1 }}>
        <div style={{ width: "6vw", height: "6vw", backgroundColor: "rgba(37,211,102,0.12)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "3vh", border: "1px solid rgba(37,211,102,0.25)" }}>
          <div style={{ width: "3.5vw", height: "3.5vw", backgroundColor: "#25D366", borderRadius: "0.6vw" }} />
        </div>

        <h1 style={{ fontSize: "6vw", fontWeight: 800, margin: "0 0 2vh 0", lineHeight: 1.05, letterSpacing: "-0.03em", textWrap: "balance" }}>
          Seu WhatsApp,<br />organizado.
        </h1>
        <p style={{ fontSize: "1.5vw", fontWeight: 400, color: "rgba(255,255,255,0.65)", margin: "0 0 5vh 0", lineHeight: 1.5, maxWidth: "50vw", textWrap: "pretty" }}>
          Atenda mais rápido, meça tudo e não perca nenhum cliente.
        </p>

        <div style={{ display: "flex", gap: "2vw", marginBottom: "5vh" }}>
          <div style={{ background: "#25D366", color: "#FFFFFF", padding: "1.8vh 3.5vw", borderRadius: "0.4vw", fontSize: "1.1vw", fontWeight: 600, letterSpacing: "0.01em" }}>
            Conectar WhatsApp
          </div>
          <div style={{ background: "rgba(255,255,255,0.08)", color: "#FFFFFF", padding: "1.8vh 3.5vw", borderRadius: "0.4vw", border: "1px solid rgba(255,255,255,0.15)", fontSize: "1.1vw", fontWeight: 500 }}>
            Falar com o time
          </div>
        </div>

        <div style={{ display: "flex", gap: "4vw", padding: "2.5vh 5vw", background: "rgba(255,255,255,0.05)", borderRadius: "0.8vw", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: "0.8vw", fontWeight: 600, color: "rgba(255,255,255,0.4)", marginBottom: "0.4vh", textTransform: "uppercase", letterSpacing: "0.05em" }}>Plataforma</div>
            <div style={{ fontSize: "1vw", fontWeight: 600, color: "#FFFFFF" }}>Pronto para publicar hoje</div>
          </div>
          <div style={{ width: "1px", backgroundColor: "rgba(255,255,255,0.1)" }} />
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: "0.8vw", fontWeight: 600, color: "rgba(255,255,255,0.4)", marginBottom: "0.4vh", textTransform: "uppercase", letterSpacing: "0.05em" }}>Stack</div>
            <div style={{ fontSize: "1vw", fontWeight: 600, color: "#FFFFFF" }}>React · PostgreSQL · Evolution API</div>
          </div>
          <div style={{ width: "1px", backgroundColor: "rgba(255,255,255,0.1)" }} />
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: "0.8vw", fontWeight: 600, color: "rgba(255,255,255,0.4)", marginBottom: "0.4vh", textTransform: "uppercase", letterSpacing: "0.05em" }}>Segurança</div>
            <div style={{ fontSize: "1vw", fontWeight: 600, color: "#FFFFFF" }}>Multi-tenant isolado</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "2vh", fontSize: "0.85vw", color: "rgba(255,255,255,0.3)", fontWeight: 500, position: "relative", zIndex: 1 }}>
        <div>ZapCentral — Central Operacional Inteligente</div>
        <div>16 de 16</div>
      </div>
    </div>
  );
}
