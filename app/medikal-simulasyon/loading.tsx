export default function MedicalSimulationLoading() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        color: "#10233f",
        background: "linear-gradient(180deg, #f8fafb 0%, #eef2f3 100%)",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
      aria-live="polite"
      aria-busy="true"
    >
      <div style={{ maxWidth: "520px", textAlign: "center" }}>
        <strong style={{ display: "block", fontSize: "14px", letterSpacing: "0.08em" }}>
          TEYS MEDİKAL SİMÜLASYON
        </strong>
        <h1 style={{ margin: "14px 0 9px", fontSize: "clamp(32px, 7vw, 52px)", lineHeight: 1 }}>
          Klinik simülasyon hazırlanıyor
        </h1>
        <p style={{ margin: 0, color: "#68778a", lineHeight: 1.65 }}>
          Sentetik hasta durumu, yeterlilik yolu ve karar senaryosu yükleniyor.
        </p>
      </div>
    </main>
  );
}
