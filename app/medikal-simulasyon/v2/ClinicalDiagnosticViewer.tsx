import type { ClinicalState } from "../../../services/medical-simulation-v2/engine.js";
import styles from "./simulation-v2.module.css";

const leadPaths = [
  "M0 27 L18 27 L22 24 L26 27 L32 27 L37 9 L42 45 L48 27 L58 27 L63 21 L70 27 L94 27 L99 24 L103 27 L109 27 L114 9 L119 45 L125 27 L136 27 L141 21 L148 27 L174 27 L179 24 L183 27 L189 27 L194 9 L199 45 L205 27 L216 27 L221 21 L228 27 L250 27",
  "M0 29 L20 29 L25 25 L31 29 L39 29 L44 7 L50 49 L57 29 L65 29 L72 17 L99 17 L111 29 L132 29 L137 25 L143 29 L151 29 L156 7 L162 49 L169 29 L177 29 L184 17 L211 17 L223 29 L250 29",
  "M0 27 L21 27 L27 23 L33 27 L42 27 L47 11 L52 44 L59 27 L70 27 L76 19 L101 19 L112 27 L136 27 L142 23 L148 27 L157 27 L162 11 L167 44 L174 27 L185 27 L191 19 L216 19 L227 27 L250 27",
];

export default function ClinicalDiagnosticViewer({ state }: { state: ClinicalState }) {
  const ecg = state.orders.find((order) => order.id === "ecg");
  if (!ecg) return <section className={styles.diagnosticViewer} data-state="idle"><div><span>12 DERİVASYONLU EKG</span><b>Henüz istenmedi</b></div><p>Yatak başı EKG eylemi uygulandığında sonuç burada gerçek zamanlı açılır.</p></section>;
  if (ecg.status === "pending") {
    const remaining = Math.max(0, ecg.readyAtSeconds - state.elapsedSeconds);
    return <section className={styles.diagnosticViewer} data-state="pending"><div><span>12 DERİVASYONLU EKG</span><b>Çekim sürüyor · {Math.ceil(remaining / 60)} dk</b></div><div className={styles.diagnosticProgress}><i style={{ width: `${Math.max(12, 100 - remaining / 1.2)}%` }} /></div><p>Elektrot yerleşimi tamamlandı; trase işleniyor. Klinik zamanı ilerleterek sonucu açın.</p></section>;
  }
  return <section className={styles.diagnosticViewer} data-state="ready" aria-label="Hazır 12 derivasyonlu EKG sonucu">
    <div><span>12 DERİVASYONLU EKG · HAZIR</span><b>Akut STEMI paterni</b></div>
    <svg viewBox="0 0 820 196" role="img" aria-label="ST yükselmesi gösteren sentetik EKG trasesi">
      <defs><pattern id="ecg-grid-small" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" /></pattern><pattern id="ecg-grid-large" width="50" height="50" patternUnits="userSpaceOnUse"><rect width="50" height="50" fill="url(#ecg-grid-small)" /><path d="M 50 0 L 0 0 0 50" /></pattern></defs>
      <rect width="820" height="196" fill="url(#ecg-grid-large)" />
      {leadPaths.map((path, index) => <g key={path} transform={`translate(${index % 2 ? 425 : 50} ${index < 2 ? 26 : 105})`}><text x="-28" y="31">{["II", "V2", "V4"][index]}</text><path d={path} /></g>)}
      <path className={styles.stMarker} d="M596 78 L596 42 L705 42 L705 78" />
      <text className={styles.stLabel} x="610" y="34">ST YÜKSELMESİ</text>
    </svg>
    <p>{ecg.result}</p>
  </section>;
}
