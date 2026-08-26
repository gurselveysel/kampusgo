"use client";

import styles from "./medical-simulation.module.css";
import type {
  PatientPhase,
  SimulationAction,
  SimulationModule,
  VitalState,
} from "./simulation-data";

export type ArxivisualSceneContext = {
  module: SimulationModule;
  action: SimulationAction;
  beforeVitals: VitalState;
  afterVitals: VitalState;
  beforePhase: PatientPhase;
  afterPhase: PatientPhase;
};

export default function ArxivisualScenePanel({
  context,
}: {
  context: ArxivisualSceneContext | null;
}) {
  return (
    <section className={styles.arxivisualPanel} aria-labelledby="arxivisual-panel-title">
      <div className={styles.arxivisualHeader}>
        <div>
          <span>ARXIVISUAL · GERÇEK AI + MANIM HATTI</span>
          <h3 id="arxivisual-panel-title">Klinik kararını doğrulanan Manim sahnesine dönüştür</h3>
        </div>
        <i className={styles["engine-disabled"]}>Kontrollü pilot</i>
      </div>

      <p className={styles.engineMessage}>
        Canlı üretim; ayrı pilot oturumu, kaynak/türev hakkı ve gerçek uzman onay referansı gerektirir.
      </p>

      <div className={styles.renderProof}>
        <video
          controls
          playsInline
          preload="metadata"
          src="/medical-simulation/manim/med_seed_vf_rosc.mp4"
        >
          Tarayıcınız MP4 video oynatmayı desteklemiyor.
        </video>
        <div>
          <span>DOĞRULANMIŞ RENDER KANITI</span>
          <strong>arXivisual validator → gerçek Manim MP4</strong>
          <p>Sentetik VF–ROSC geçişi; AI üretimi değil, güvenli template/render yolunun yerel kanıtıdır.</p>
        </div>
      </div>

      {context ? (
        <div className={styles.sceneSourceCard}>
          <div>
            <span>SON KARAR</span>
            <strong>{context.action.shortLabel}</strong>
            <small>{context.module.code} · {context.module.title}</small>
          </div>
          <p>{context.action.feedback}</p>
        </div>
      ) : (
        <div className={styles.sceneSourceEmpty}>
          Bir klinik karar uygula; son kararın burada arXivisual girdisi olarak görünür.
        </div>
      )}

      <a className={styles.sceneStudioLink} href="/medikal-simulasyon/ai-studio">
        arXivisual Klinik Studio’yu aç
      </a>

      <footer>
        AI klinik kural üretmez. Uzman onayı olmadan canlı iş başlatılamaz. Production: NO-GO.
      </footer>
    </section>
  );
}
