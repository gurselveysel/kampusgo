"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import styles from "./medical-simulation.module.css";
import { medicalSceneForModule, medicalSceneLibrary } from "./scene-library";
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

type VitalRow = {
  label: string;
  before: string;
  after: string;
  changed: boolean;
};

function vitalRows(context: ArxivisualSceneContext): VitalRow[] {
  const before = context.beforeVitals;
  const after = context.afterVitals;
  return [
    { label: "HR", before: String(before.heartRate), after: String(after.heartRate), changed: before.heartRate !== after.heartRate },
    { label: "SpO₂", before: `${before.spo2}%`, after: `${after.spo2}%`, changed: before.spo2 !== after.spo2 },
    {
      label: "TA",
      before: `${before.systolic}/${before.diastolic}`,
      after: `${after.systolic}/${after.diastolic}`,
      changed: before.systolic !== after.systolic || before.diastolic !== after.diastolic,
    },
    {
      label: "SS",
      before: String(before.respiratoryRate),
      after: String(after.respiratoryRate),
      changed: before.respiratoryRate !== after.respiratoryRate,
    },
  ];
}

export default function ArxivisualScenePanel({
  context,
  module,
}: {
  context: ArxivisualSceneContext | null;
  module: SimulationModule;
}) {
  const [selectedSceneId, setSelectedSceneId] = useState(module.id);

  useEffect(() => {
    setSelectedSceneId(context?.module.id ?? module.id);
  }, [context?.action.id, context?.module.id, module.id]);

  const selectedScene = medicalSceneForModule(selectedSceneId);
  const impact = useMemo(() => (context ? vitalRows(context) : []), [context]);
  const contextMatchesScene = context?.module.id === selectedScene.moduleId;
  const playbackKey = `${selectedScene.moduleId}-${contextMatchesScene ? context?.action.id : "preview"}`;

  return (
    <section className={styles.arxivisualPanel} aria-labelledby="arxivisual-panel-title">
      <div className={styles.arxivisualHeader}>
        <div>
          <span>ARXIVISUAL DOĞRULAMA + GERÇEK MANIM RENDER</span>
          <h3 id="arxivisual-panel-title">Sekiz modüllü klinik sahne kitaplığı</h3>
        </div>
        <i className={styles["engine-ready"]}>8 sahne hazır</i>
      </div>

      <p className={styles.engineMessage}>
        Her modül ayrı MP4 sahnesi kullanır. Klinik karar verdiğinde ilgili sahne baştan oynar,
        karar sonucu ve vital değişimi aşağıda canlı olarak güncellenir.
      </p>

      <div className={styles.sceneLibrary} aria-label="Manim sahne kitaplığı">
        {medicalSceneLibrary.map((scene) => (
          <button
            type="button"
            key={scene.moduleId}
            aria-pressed={selectedScene.moduleId === scene.moduleId}
            className={selectedScene.moduleId === scene.moduleId ? styles.sceneLibraryActive : ""}
            onClick={() => setSelectedSceneId(scene.moduleId)}
          >
            <b>{scene.code}</b>
            <span>{scene.title}</span>
          </button>
        ))}
      </div>

      <div className={styles.renderProof} data-scene-module={selectedScene.moduleId}>
        <video
          key={playbackKey}
          controls
          autoPlay
          muted
          playsInline
          preload="metadata"
          src={selectedScene.video}
          aria-label={`${selectedScene.code} ${selectedScene.title} Manim sahnesi`}
        >
          Tarayıcınız MP4 video oynatmayı desteklemiyor.
        </video>
        <div>
          <span>SAHNE {selectedScene.code} / 08</span>
          <strong>{selectedScene.title}</strong>
          <p>{selectedScene.description}</p>
          <small>{selectedScene.focus} · {selectedScene.scenarioId}</small>
        </div>
      </div>

      <div className={styles.scenePipeline} aria-label="Sahne işleme zinciri">
        {["Olay", "Plan", "Doğrula", "Render", "Sonuç"].map((step, index) => (
          <div key={step} style={{ "--pipeline-index": index } as CSSProperties}>
            <i />
            <span>{step}</span>
          </div>
        ))}
      </div>

      {context ? (
        <div className={styles.sceneSourceCard} aria-live="polite">
          <div>
            <span>SON KARAR · İŞLENDİ</span>
            <strong>{context.action.shortLabel}</strong>
            <small>{context.module.code} · {context.module.title}</small>
          </div>
          <p>{context.action.feedback}</p>
        </div>
      ) : (
        <div className={styles.sceneSourceEmpty}>
          Bir klinik görev uygula; ilgili modül sahnesi yeniden oynatılır ve karar etkisi burada görünür.
        </div>
      )}

      {context ? (
        <div className={styles.vitalImpact} aria-label="Karar sonrası vital değişim">
          {impact.map((item) => (
            <article key={item.label} className={item.changed ? styles.vitalChanged : ""}>
              <span>{item.label}</span>
              <small>{item.before}</small>
              <i>→</i>
              <strong>{item.after}</strong>
            </article>
          ))}
          <article className={context.beforePhase !== context.afterPhase ? styles.vitalChanged : ""}>
            <span>FAZ</span>
            <small>{context.beforePhase}</small>
            <i>→</i>
            <strong>{context.afterPhase}</strong>
          </article>
        </div>
      ) : null}

      <a className={styles.sceneStudioLink} href="/medikal-simulasyon/ai-studio">
        Sekiz sahneyi Klinik Studio’da aç
      </a>

      <footer>
        Sahne kitaplığı sentetik ve deterministiktir; arXivisual doğrulayıcılarından ve gerçek Manim render
        zincirinden geçer. Harici AI sağlayıcısı kapalıdır. Uzman onayı: DOĞRULANMADI · Production: NO-GO.
      </footer>
    </section>
  );
}
