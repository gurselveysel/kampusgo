"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CURRICULUM_PERIODS,
  INSTITUTION_MODELS,
  OFFICIAL_SOURCE_REGISTRY,
  getInstitutionModel,
  getScenarioAlignment,
  type CurriculumPeriodId,
  type InstitutionModelId,
} from "../../../services/medical-simulation-v2/curriculum-catalog.js";
import styles from "./simulation-v2.module.css";

type Props = {
  encounterId: string;
  selectedPeriodId: CurriculumPeriodId;
  selectedModelId: InstitutionModelId;
  onApply: (periodId: CurriculumPeriodId, modelId: InstitutionModelId) => void;
  onClose: () => void;
};

export default function CurriculumNavigator({ encounterId, selectedPeriodId, selectedModelId, onApply, onClose }: Props) {
  const [periodId, setPeriodId] = useState<CurriculumPeriodId>(selectedPeriodId);
  const [modelId, setModelId] = useState<InstitutionModelId>(selectedModelId);
  const period = useMemo(() => CURRICULUM_PERIODS.find((item) => item.id === periodId) ?? CURRICULUM_PERIODS[5], [periodId]);
  const model = useMemo(() => getInstitutionModel(modelId), [modelId]);
  const alignment = useMemo(() => getScenarioAlignment(encounterId), [encounterId]);

  useEffect(() => {
    setPeriodId(selectedPeriodId);
    setModelId(selectedModelId);
  }, [selectedModelId, selectedPeriodId]);

  return (
    <section className={styles.curriculumPanel} aria-labelledby="curriculum-title">
      <div className={styles.libraryHead}>
        <div>
          <span>ALTI YILLIK PROGRAM GEZGİNİ</span>
          <h2 id="curriculum-title">Olgunun eğitim programındaki yerini seçin</h2>
          <p>Seçiminiz olgunun önerilen dönemini ve kurum içindeki sunum biçimini değiştirir; resmî onay yerine geçmez.</p>
        </div>
        <button type="button" data-action-contract="Müfredat gezginini kapatır" onClick={onClose} aria-label="Müfredat gezginini kapat">Kapat</button>
      </div>

      <div className={styles.curriculumSelectors}>
        <fieldset>
          <legend>Dönem</legend>
          <div className={styles.periodPicker}>
            {CURRICULUM_PERIODS.map((item) => (
              <button
                type="button"
                key={item.id}
                aria-pressed={periodId === item.id}
                disabled={periodId === item.id}
                data-action-contract={`${item.label} program içeriğini gösterir`}
                onClick={() => setPeriodId(item.id)}
              >
                <strong>{item.label}</strong>
                <span>{item.stage}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Kurum program modeli</legend>
          <div className={styles.modelPicker}>
            {INSTITUTION_MODELS.map((item) => (
              <button
                type="button"
                key={item.id}
                aria-pressed={modelId === item.id}
                disabled={modelId === item.id}
                data-action-contract={`${item.label} kurum modelini önizler`}
                onClick={() => setModelId(item.id)}
              >
                <strong>{item.label}</strong>
                <span>{item.description}</span>
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <div className={styles.curriculumSummary} aria-live="polite">
        <article>
          <span>SEÇİLİ DÖNEM</span>
          <h3>{period.label} · {period.stage}</h3>
          <p>{period.simulationRole}</p>
          <ul>{period.modules.map((module) => <li key={module}>{module}</li>)}</ul>
        </article>
        <article>
          <span>SEÇİLİ KURUM MODELİ</span>
          <h3>{model.label}</h3>
          <p>{model.description}</p>
          <small>Bu profil kurumun kendi ders kodları, kurul adları ve staj takvimi eklenmeden “kuruma uyumlu” sayılmaz.</small>
        </article>
        <article>
          <span>BU OLGUNUN EŞLEMESİ</span>
          <h3>{alignment.modules.join(" · ")}</h3>
          <p>{alignment.ucepScope}</p>
          <small>Önerilen dönemler: {alignment.recommendedPeriods.map((id) => CURRICULUM_PERIODS.find((item) => item.id === id)?.label).join(", ")} · {alignment.approvalStatus}</small>
        </article>
      </div>

      <div className={styles.sourceRegistry}>
        <div><span>RESMÎ KAYNAKLAR</span><b>{OFFICIAL_SOURCE_REGISTRY.length} kayıt · erişim 28.08.2026</b></div>
        <ul>
          {OFFICIAL_SOURCE_REGISTRY.map((source) => (
            <li key={source.id}>
              <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a>
              <span>{source.publisher} · {source.location}</span>
              <small>{source.expertApprovalStatus}</small>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        className={styles.applyCurriculum}
        data-action-contract="Seçilen dönem ve kurum modelini olgu üst bilgisine uygular"
        onClick={() => onApply(periodId, modelId)}
      >
        Bu program bağlamını uygula
      </button>
    </section>
  );
}
