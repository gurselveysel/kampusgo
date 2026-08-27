import type { ClinicalState } from "../../../services/medical-simulation-v2/engine.js";
import styles from "./simulation-v2.module.css";

const waveformPaths: Record<ClinicalState["vitals"]["rhythm"], string> = {
  sinus: "M0 44 L18 44 L23 41 L29 44 L36 44 L41 20 L47 68 L54 44 L66 44 L72 37 L80 44 L103 44 L108 41 L114 44 L121 44 L126 20 L132 68 L139 44 L151 44 L157 37 L165 44 L188 44 L193 41 L199 44 L206 44 L211 20 L217 68 L224 44 L236 44 L242 37 L250 44 L273 44 L278 41 L284 44 L291 44 L296 20 L302 68 L309 44 L321 44 L327 37 L335 44 L358 44 L363 41 L369 44 L376 44 L381 20 L387 68 L394 44 L406 44 L412 37 L420 44",
  stemi: "M0 45 L18 45 L25 42 L31 45 L38 45 L43 19 L49 68 L56 45 L64 45 L72 34 L93 34 L102 45 L121 45 L126 42 L132 45 L139 45 L144 19 L150 68 L157 45 L165 45 L173 34 L194 34 L203 45 L222 45 L227 42 L233 45 L240 45 L245 19 L251 68 L258 45 L266 45 L274 34 L295 34 L304 45 L323 45 L328 42 L334 45 L341 45 L346 19 L352 68 L359 45 L367 45 L375 34 L396 34 L405 45 L420 45",
  vf: "M0 48 L8 28 L16 57 L24 23 L32 64 L40 36 L48 54 L56 19 L64 61 L72 31 L80 50 L88 25 L96 66 L104 39 L112 17 L120 58 L128 30 L136 53 L144 21 L152 64 L160 35 L168 55 L176 24 L184 62 L192 34 L200 49 L208 17 L216 59 L224 28 L232 65 L240 38 L248 19 L256 56 L264 29 L272 63 L280 36 L288 16 L296 59 L304 31 L312 55 L320 22 L328 64 L336 35 L344 53 L352 18 L360 60 L368 27 L376 66 L384 36 L392 20 L400 58 L408 29 L420 53",
  rosc: "M0 45 L25 45 L31 42 L38 45 L46 45 L51 22 L57 64 L64 45 L78 45 L86 37 L97 45 L130 45 L136 42 L143 45 L151 45 L156 22 L162 64 L169 45 L183 45 L191 37 L202 45 L235 45 L241 42 L248 45 L256 45 L261 22 L267 64 L274 45 L288 45 L296 37 L307 45 L340 45 L346 42 L353 45 L361 45 L366 22 L372 64 L379 45 L393 45 L401 37 L412 45 L420 45",
};

function VitalCard({ label, value, unit, alert = false }: { label: string; value: string | number; unit: string; alert?: boolean }) {
  return <article data-alert={alert}><small>{label}</small><strong>{value}</strong><span>{unit}</span></article>;
}

export default function BedsideMonitor({ state }: { state: ClinicalState }) {
  const { vitals } = state;
  const critical = vitals.rhythm === "vf" || vitals.systolic < 80 || vitals.spo2 < 90;
  return <aside className={styles.monitor} data-critical={critical} aria-label="Hasta monitörü" aria-live="polite">
    <div className={styles.monitorHead}><span>TEYS MONITOR · CANLI</span><b>{vitals.rhythm.toUpperCase()}</b></div>
    <div className={styles.ecg} data-rhythm={vitals.rhythm}>
      <svg viewBox="0 0 420 88" preserveAspectRatio="none" role="img" aria-label={`${vitals.rhythm.toUpperCase()} ritim dalgası`}>
        <path d={waveformPaths[vitals.rhythm]} pathLength="1" />
        <line x1="0" x2="420" y1="74" y2="74" />
      </svg>
    </div>
    <div className={styles.vitalGrid}>
      <VitalCard label="HR" value={vitals.heartRate} unit="/dk" alert={vitals.heartRate > 130 || vitals.heartRate < 50} />
      <VitalCard label="SpO₂" value={vitals.spo2} unit="%" alert={vitals.spo2 < 90} />
      <VitalCard label="TA" value={`${vitals.systolic}/${vitals.diastolic}`} unit="mmHg" alert={vitals.systolic < 90} />
      <VitalCard label="SS" value={vitals.respiratoryRate} unit="/dk" alert={vitals.respiratoryRate > 28 || vitals.respiratoryRate === 0} />
      <VitalCard label="ISI" value={vitals.temperature.toFixed(1)} unit="°C" />
      <VitalCard label="EtCO₂" value={vitals.etco2 ?? "—"} unit="mmHg" />
    </div>
  </aside>;
}
