"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import ArxivisualScenePanel, {
  type ArxivisualSceneContext,
} from "./ArxivisualScenePanel";
import styles from "./medical-simulation.module.css";
import {
  competencyLoop,
  curriculumComposition,
  medicalSimulationModules,
  patientProfile,
  type ModuleId,
  type PatientPhase,
  type SimulationAction,
  type SimulationModule,
  type VitalState,
} from "./simulation-data";

const STORAGE_KEY = "teys-medical-simulation-progress-v1";

type TimelineEntry = {
  id: string;
  minute: number;
  label: string;
  feedback: string;
  safety: SimulationAction["safety"];
};

type ProgressState = {
  completedModules: ModuleId[];
  scores: Partial<Record<ModuleId, number>>;
};

type DebriefState = {
  score: number;
  passed: boolean;
  coverage: number;
  timePenalty: number;
  rationaleBonus: number;
  missedRequired: SimulationAction[];
  positiveActions: SimulationAction[];
  harmfulActions: SimulationAction[];
};

const emptyProgress: ProgressState = {
  completedModules: [],
  scores: {},
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function applyVitalDelta(vitals: VitalState, action: SimulationAction): VitalState {
  const delta = action.vitalDelta ?? {};
  return {
    heartRate: clamp(vitals.heartRate + (delta.heartRate ?? 0), 0, 220),
    systolic: clamp(vitals.systolic + (delta.systolic ?? 0), 0, 240),
    diastolic: clamp(vitals.diastolic + (delta.diastolic ?? 0), 0, 160),
    spo2: clamp(vitals.spo2 + (delta.spo2 ?? 0), 0, 100),
    respiratoryRate: clamp(
      vitals.respiratoryRate + (delta.respiratoryRate ?? 0),
      0,
      60,
    ),
    temperature: clamp(vitals.temperature + (delta.temperature ?? 0), 30, 43),
    rhythm: action.rhythm ?? vitals.rhythm,
  };
}

function arrestVitals(vitals: VitalState): VitalState {
  return {
    ...vitals,
    heartRate: 0,
    systolic: 0,
    diastolic: 0,
    spo2: clamp(vitals.spo2 - 14, 58, 82),
    respiratoryRate: 0,
    rhythm: "vf",
  };
}

function roscVitals(vitals: VitalState): VitalState {
  return {
    ...vitals,
    heartRate: 92,
    systolic: 106,
    diastolic: 68,
    spo2: 96,
    respiratoryRate: 18,
    rhythm: "rosc",
  };
}

function moduleIsUnlocked(moduleId: ModuleId, completedModules: ModuleId[]): boolean {
  return moduleId === 1 || completedModules.includes((moduleId - 1) as ModuleId);
}

function visibleAction(
  action: SimulationAction,
  selectedActionIds: string[],
  phase: PatientPhase,
): boolean {
  if (action.phase && action.phase !== phase) return false;
  if (action.requires?.some((requirement) => !selectedActionIds.includes(requirement))) {
    return false;
  }
  return true;
}

function patientCondition(vitals: VitalState, phase: PatientPhase): string {
  if (phase === "vf" || vitals.rhythm === "vf") return "Kardiyak arrest — şoklanabilir ritim";
  if (phase === "rosc" || vitals.rhythm === "rosc") return "ROSC — yakın yeniden değerlendirme";
  if (vitals.systolic < 80 || vitals.spo2 < 85) return "Kritik — dolaşım ve oksijenasyon bozuluyor";
  if (vitals.systolic < 100 || vitals.spo2 < 92) return "İnstabil — yüksek riskli klinik durum";
  return "Kısmi stabilizasyon — yakın izlem sürüyor";
}

function ecgPath(rhythm: VitalState["rhythm"]): string {
  if (rhythm === "vf") {
    return "M0 52 C12 2 22 98 34 28 S56 92 68 14 S92 104 106 40 S128 2 142 76 S165 94 178 18 S202 104 220 44 S245 6 258 82 S282 92 300 26 S330 100 348 42 S370 3 386 76 S408 96 424 18 S448 102 466 45 S490 8 506 82 S532 96 548 24 S575 100 598 38 S620 6 640 70";
  }
  if (rhythm === "stemi") {
    return "M0 58 L30 58 L38 50 L44 58 L58 58 L64 28 L70 88 L76 46 L88 46 L112 46 L126 42 L142 58 L176 58 L184 50 L190 58 L204 58 L210 28 L216 88 L222 46 L234 46 L258 46 L274 42 L290 58 L324 58 L332 50 L338 58 L352 58 L358 28 L364 88 L370 46 L382 46 L406 46 L422 42 L438 58 L472 58 L480 50 L486 58 L500 58 L506 28 L512 88 L518 46 L530 46 L554 46 L570 42 L586 58 L640 58";
  }
  return "M0 58 L30 58 L38 50 L44 58 L58 58 L64 28 L70 88 L76 58 L94 58 Q110 36 128 58 L176 58 L184 50 L190 58 L204 58 L210 28 L216 88 L222 58 L240 58 Q256 36 274 58 L324 58 L332 50 L338 58 L352 58 L358 28 L364 88 L370 58 L388 58 Q404 36 422 58 L472 58 L480 50 L486 58 L500 58 L506 28 L512 88 L518 58 L536 58 Q552 36 570 58 L640 58";
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value);
}

function PatientFigure({
  vitals,
  phase,
  statement,
}: {
  vitals: VitalState;
  phase: PatientPhase;
  statement: string;
}) {
  const breathSeconds = vitals.respiratoryRate > 0
    ? clamp(60 / vitals.respiratoryRate, 0.8, 4)
    : 4;
  const figureStyle = {
    "--breath-duration": `${breathSeconds}s`,
  } as CSSProperties;
  const critical = phase === "vf" || vitals.systolic < 80 || vitals.spo2 < 85;

  return (
    <div className={`${styles.patientScene} ${critical ? styles.patientCritical : ""}`}>
      <div className={styles.roomGlow} aria-hidden="true" />
      <div className={styles.patientStatement}>{statement}</div>
      <div className={styles.bed} aria-hidden="true">
        <span className={styles.bedRail} />
        <span className={styles.mattress} />
        <div className={styles.patientFigure} style={figureStyle}>
          <span className={styles.patientHead}>
            <i className={styles.eyeLeft} />
            <i className={styles.eyeRight} />
            <i className={styles.patientMouth} />
            <b className={styles.sweatDrop} />
          </span>
          <span className={styles.patientNeck} />
          <span className={styles.patientTorso}>
            <i className={styles.chestRise} />
            <i className={styles.ecgLeadOne} />
            <i className={styles.ecgLeadTwo} />
          </span>
          <span className={styles.patientArmLeft} />
          <span className={styles.patientArmRight} />
          <span className={styles.patientLegs} />
        </div>
      </div>
      <div className={styles.oxygenLine} aria-hidden="true">
        <span />
      </div>
      <div className={styles.patientSceneLabel}>
        <span className={critical ? styles.redDot : styles.amberDot} />
        {patientCondition(vitals, phase)}
      </div>
    </div>
  );
}

function VitalMonitor({ vitals }: { vitals: VitalState }) {
  const rhythmLabel = {
    sinus: "Sinüs taşikardisi",
    stemi: "ST elevasyonlu ritim",
    vf: "Ventriküler fibrilasyon",
    rosc: "Organize ritim — ROSC",
  }[vitals.rhythm];

  return (
    <div className={`${styles.monitor} ${vitals.rhythm === "vf" ? styles.monitorAlarm : ""}`}>
      <div className={styles.monitorHeader}>
        <span>CANLI MONİTÖR</span>
        <strong>{rhythmLabel}</strong>
      </div>
      <svg className={styles.ecg} viewBox="0 0 640 110" role="img" aria-label={rhythmLabel}>
        <defs>
          <linearGradient id="ecgGlow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#41f5a7" stopOpacity="0.25" />
            <stop offset="55%" stopColor="#41f5a7" />
            <stop offset="100%" stopColor="#41f5a7" stopOpacity="0.25" />
          </linearGradient>
        </defs>
        <g className={styles.monitorGrid} aria-hidden="true">
          {Array.from({ length: 13 }).map((_, index) => (
            <line key={`v-${index}`} x1={index * 54} y1="0" x2={index * 54} y2="110" />
          ))}
          {Array.from({ length: 5 }).map((_, index) => (
            <line key={`h-${index}`} x1="0" y1={index * 27.5} x2="640" y2={index * 27.5} />
          ))}
        </g>
        <path className={styles.ecgGlow} d={ecgPath(vitals.rhythm)} />
        <path className={styles.ecgTrace} d={ecgPath(vitals.rhythm)} />
      </svg>
      <div className={styles.vitalGrid}>
        <div>
          <small>HR</small>
          <strong>{vitals.heartRate || "—"}</strong>
          <span>/dk</span>
        </div>
        <div>
          <small>SpO₂</small>
          <strong>{vitals.spo2 || "—"}</strong>
          <span>%</span>
        </div>
        <div>
          <small>TA</small>
          <strong>{vitals.systolic || "—"}/{vitals.diastolic || "—"}</strong>
          <span>mmHg</span>
        </div>
        <div>
          <small>SS</small>
          <strong>{vitals.respiratoryRate || "—"}</strong>
          <span>/dk</span>
        </div>
      </div>
    </div>
  );
}

function TeamPanel({ selectedActionIds }: { selectedActionIds: string[] }) {
  const members = [
    ["H", "Hekim", "Liderlik ve ritim"],
    ["HM", "Hemşire", "İlaç ve defibrilatör"],
    ["P", "Paramedik", "Kompresyon"],
    ["T", "Teknisyen", "Ekipman ve kayıt"],
    ["K", "Konsültan", "Kardiyoloji planı"],
  ];
  const assignedCount = selectedActionIds.filter((id) => id.startsWith("team-assign")).length;

  return (
    <div className={styles.teamPanel}>
      <div className={styles.teamPanelHeader}>
        <span>KLİNİK EKİP</span>
        <strong>{assignedCount}/2 kritik görev atandı</strong>
      </div>
      <div className={styles.teamMembers}>
        {members.map(([initials, role, duty], index) => {
          const assigned = index === 0 || (index === 1 && selectedActionIds.includes("team-assign-defib")) ||
            (index === 2 && selectedActionIds.includes("team-assign-compressions")) ||
            (index === 4 && selectedActionIds.includes("team-sbar"));
          return (
            <article className={assigned ? styles.teamAssigned : ""} key={role}>
              <span>{initials}</span>
              <div>
                <strong>{role}</strong>
                <small>{duty}</small>
              </div>
              <i>{assigned ? "Görevli" : "Bekliyor"}</i>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default function MedicalSimulationPage() {
  const [progress, setProgress] = useState<ProgressState>(emptyProgress);
  const [selectedModuleId, setSelectedModuleId] = useState<ModuleId>(1);
  const [selectedActionIds, setSelectedActionIds] = useState<string[]>([]);
  const [vitals, setVitals] = useState<VitalState>(medicalSimulationModules[0].initialVitals);
  const [phase, setPhase] = useState<PatientPhase>(medicalSimulationModules[0].initialPhase);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [financialCost, setFinancialCost] = useState(0);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [reveals, setReveals] = useState<string[]>([]);
  const [rationale, setRationale] = useState("");
  const [debrief, setDebrief] = useState<DebriefState | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [arxivisualScene, setArxivisualScene] = useState<ArxivisualSceneContext | null>(null);

  const selectedModule = medicalSimulationModules.find(
    (module) => module.id === selectedModuleId,
  ) as SimulationModule;

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ProgressState;
        setProgress({
          completedModules: Array.isArray(parsed.completedModules)
            ? parsed.completedModules.filter((id): id is ModuleId =>
                Number.isInteger(id) && id >= 1 && id <= 8,
              )
            : [],
          scores: parsed.scores ?? {},
        });
      }
    } catch {
      setProgress(emptyProgress);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [isHydrated, progress]);

  const actionGroups = useMemo(() => {
    const map = new Map<string, SimulationAction[]>();
    for (const action of selectedModule.actions) {
      if (!visibleAction(action, selectedActionIds, phase)) continue;
      const current = map.get(action.group) ?? [];
      current.push(action);
      map.set(action.group, current);
    }
    return Array.from(map.entries());
  }, [phase, selectedActionIds, selectedModule]);

  const requiredActions = useMemo(
    () => selectedModule.actions.filter((action) => action.required),
    [selectedModule],
  );
  const completedRequiredCount = requiredActions.filter((action) =>
    selectedActionIds.includes(action.id),
  ).length;
  const nextRequiredAction = requiredActions.find(
    (action) => !selectedActionIds.includes(action.id) && visibleAction(action, selectedActionIds, phase),
  );
  const canEvaluate =
    completedRequiredCount === requiredActions.length &&
    (!selectedModule.requiresRationale || rationale.trim().length >= 40);

  const runningScore = useMemo(() => {
    const actionScore = selectedModule.actions
      .filter((action) => selectedActionIds.includes(action.id))
      .reduce((total, action) => total + action.score, 0);
    return clamp(50 + actionScore, 0, 100);
  }, [selectedActionIds, selectedModule]);

  const overallProgress = Math.round((progress.completedModules.length / 8) * 100);
  const currentCompetency = progress.scores[selectedModuleId] ?? 0;

  function resetScenario(module: SimulationModule = selectedModule) {
    setSelectedActionIds([]);
    setVitals(module.initialVitals);
    setPhase(module.initialPhase);
    setElapsedMinutes(0);
    setFinancialCost(0);
    setTimeline([]);
    setReveals([]);
    setRationale("");
    setDebrief(null);
    setArxivisualScene(null);
  }

  function selectModule(module: SimulationModule) {
    if (!moduleIsUnlocked(module.id, progress.completedModules)) return;
    setSelectedModuleId(module.id);
    resetScenario(module);
  }

  function performAction(action: SimulationAction) {
    if (selectedActionIds.includes(action.id) || debrief) return;
    if (action.requires?.some((required) => !selectedActionIds.includes(required))) return;
    if (action.phase && action.phase !== phase) return;

    const nextIds = [...selectedActionIds, action.id];
    let nextVitals = applyVitalDelta(vitals, action);
    let nextPhase = action.transitionTo ?? phase;

    if (action.transitionTo === "vf") {
      nextVitals = arrestVitals(nextVitals);
    } else if (action.transitionTo === "rosc") {
      nextVitals = roscVitals(nextVitals);
    }

    if (
      selectedModuleId === 6 &&
      nextIds.includes("emergency-cpr") &&
      nextIds.includes("emergency-defib") &&
      nextIds.includes("emergency-resume-cpr")
    ) {
      nextPhase = "rosc";
      nextVitals = roscVitals(nextVitals);
    }

    const nextMinute = elapsedMinutes + action.timeCost;
    setSelectedActionIds(nextIds);
    setVitals(nextVitals);
    setPhase(nextPhase);
    setElapsedMinutes(nextMinute);
    setFinancialCost((current) => current + (action.financialCost ?? 0));
    setArxivisualScene({
      module: selectedModule,
      action,
      beforeVitals: vitals,
      afterVitals: nextVitals,
      beforePhase: phase,
      afterPhase: nextPhase,
    });
    setTimeline((current) => [
      ...current,
      {
        id: action.id,
        minute: nextMinute,
        label: action.shortLabel,
        feedback: action.feedback,
        safety: action.safety,
      },
    ]);
    if (action.reveal) {
      setReveals((current) => [...current, action.reveal as string]);
    }
  }

  function evaluateScenario() {
    if (!canEvaluate) return;

    const selectedActions = selectedModule.actions.filter((action) =>
      selectedActionIds.includes(action.id),
    );
    const requiredActions = selectedModule.actions.filter((action) => action.required);
    const missedRequired = requiredActions.filter(
      (action) => !selectedActionIds.includes(action.id),
    );
    const coverage = requiredActions.length
      ? Math.round(((requiredActions.length - missedRequired.length) / requiredActions.length) * 100)
      : 100;
    const positiveActions = selectedActions.filter((action) => action.score > 0);
    const harmfulActions = selectedActions.filter((action) => action.score < 0);
    const rationaleBonus = selectedModule.requiresRationale
      ? rationale.trim().length >= 40
        ? 8
        : 0
      : 0;

    let timePenalty = 0;
    if (selectedModuleId === 4 && elapsedMinutes > 22) {
      timePenalty += Math.min(25, Math.round((elapsedMinutes - 22) * 0.7));
    }
    if (selectedModuleId === 6) {
      const defibEvent = timeline.find((event) => event.id === "emergency-defib");
      if (!defibEvent) timePenalty += 25;
      else if (defibEvent.minute > 5) timePenalty += Math.min(25, (defibEvent.minute - 5) * 4);
    }
    if (selectedModuleId === 8) {
      const defibEvent = timeline.find((event) => event.id === "integrated-defib");
      const vfEvent = timeline.find((event) => event.id === "integrated-cath");
      if (vfEvent && (!defibEvent || defibEvent.minute - vfEvent.minute > 4)) timePenalty += 20;
    }

    const weightedScore = Math.round(
      clamp(runningScore - timePenalty + rationaleBonus, 0, 100) * 0.65 + coverage * 0.35,
    );
    const hasCriticalMiss = missedRequired.some((action) => action.critical);
    const hasCriticalHarm = harmfulActions.some((action) => action.safety === "critical");
    const finalScore = hasCriticalMiss
      ? Math.min(weightedScore, selectedModule.minimumScore - 1)
      : hasCriticalHarm
        ? Math.min(weightedScore, 79)
        : weightedScore;
    const passed = finalScore >= selectedModule.minimumScore && !hasCriticalMiss;

    const nextDebrief: DebriefState = {
      score: finalScore,
      passed,
      coverage,
      timePenalty,
      rationaleBonus,
      missedRequired,
      positiveActions,
      harmfulActions,
    };
    setDebrief(nextDebrief);

    if (passed) {
      setProgress((current) => ({
        completedModules: current.completedModules.includes(selectedModuleId)
          ? current.completedModules
          : [...current.completedModules, selectedModuleId].sort((a, b) => a - b),
        scores: {
          ...current.scores,
          [selectedModuleId]: Math.max(current.scores[selectedModuleId] ?? 0, finalScore),
        },
      }));
    }
  }

  function continueToNextModule() {
    const next = medicalSimulationModules.find(
      (module) => module.id === ((selectedModuleId + 1) as ModuleId),
    );
    if (!next || !debrief?.passed) return;
    setSelectedModuleId(next.id);
    resetScenario(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetAllProgress() {
    setProgress(emptyProgress);
    setSelectedModuleId(1);
    resetScenario(medicalSimulationModules[0]);
    window.localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <a className={styles.brand} href="#top" aria-label="TEYS medikal simülasyon ana ekranı">
          <span className={styles.brandMark}>TEYS</span>
          <div>
            <strong>Tıp Eğitimi Yönetim Sistemi</strong>
            <small>Medical Education Management System · MAMS</small>
          </div>
        </a>
        <div className={styles.headerStatus}>
          <span className={styles.statusLight} />
          Kontrollü simülasyon pilotu
        </div>
      </header>

      <div className={styles.pilotBanner} id="top">
        <strong>EĞİTSEL SİMÜLASYON</strong>
        <span>Gerçek hasta bakımı veya klinik karar desteği değildir. Sentetik hasta ve eğitim amaçlı senaryo kullanılır.</span>
      </div>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.kicker}>GÖZLEMLE → DÜŞÜN → KARAR VER → UYGULA → SONUCU GÖR</span>
          <h1>Kararlarının hastaya ve ekibe etkisini gerçek zamanlı gör.</h1>
          <p>
            TEYS Medikal Simülasyon; sanal hastadan entegre klinik liderliğe uzanan sekiz
            ön koşullu seviyeyi, dinamik vital yanıtları ve ayrıntılı debriefing ile tek bir
            yeterlilik yolunda birleştirir.
          </p>
          <a className={styles.sourceArchitectureLink} href="/medikal-simulasyon/kaynak-mimarisi">
            40 GitHub kaynağının kullanım ve lisans haritasını incele <span>→</span>
          </a>
        </div>
        <div className={styles.curriculumCard}>
          <div className={styles.curriculumHeader}>
            <span>PROGRAM MİMARİSİ</span>
            <strong>Yatay + dikey entegrasyon</strong>
          </div>
          <div className={styles.compositionBar} aria-label="UÇEP kapsamı yüzde 100; toplam programın yaklaşık yüzde 70 ila 75'i UÇEP ve yüzde 25 ila 30'u kurumsal içerik">
            <span style={{ width: `${curriculumComposition.ucepApproximateShare}%` }}>
              %70–75 UÇEP
            </span>
            <span style={{ width: `${curriculumComposition.institutionalApproximateShare}%` }}>
              %25–30 kurum
            </span>
          </div>
          <p>{curriculumComposition.note}</p>
        </div>
      </section>

      <section className={styles.overviewGrid}>
        <article>
          <span>GENEL İLERLEME</span>
          <strong>{overallProgress}%</strong>
          <div className={styles.overviewProgress}><i style={{ width: `${overallProgress}%` }} /></div>
        </article>
        <article>
          <span>AKTİF SEVİYE</span>
          <strong>{selectedModule.code} · {selectedModule.title}</strong>
          <small>{selectedModule.level}</small>
        </article>
        <article>
          <span>YETERLİLİK</span>
          <strong>{currentCompetency || "—"}{currentCompetency ? "/100" : ""}</strong>
          <small>Minimum başarı: {selectedModule.minimumScore}</small>
        </article>
        <article>
          <span>TAMAMLANAN MODÜL</span>
          <strong>{progress.completedModules.length}/8</strong>
          <button type="button" onClick={resetAllProgress}>Pilot verisini sıfırla</button>
        </article>
      </section>

      <section className={styles.competencyLoop} aria-label="Temel öğrenme döngüsü">
        {competencyLoop.map((item, index) => (
          <div key={item}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{item}</strong>
            {index < competencyLoop.length - 1 ? <i aria-hidden="true">→</i> : null}
          </div>
        ))}
      </section>

      <section className={styles.modulePathSection}>
        <div className={styles.sectionHeading}>
          <span>ZORUNLU YETERLİLİK YOLU</span>
          <h2>Bir seviye tamamlanmadan sonraki klinik alan açılmaz.</h2>
        </div>
        <div className={styles.modulePath}>
          {medicalSimulationModules.map((module) => {
            const completed = progress.completedModules.includes(module.id);
            const unlocked = moduleIsUnlocked(module.id, progress.completedModules);
            const active = selectedModuleId === module.id;
            const score = progress.scores[module.id];
            return (
              <button
                className={`${styles.moduleNode} ${completed ? styles.moduleCompleted : ""} ${active ? styles.moduleActive : ""} ${!unlocked ? styles.moduleLocked : ""}`}
                type="button"
                key={module.id}
                disabled={!unlocked}
                onClick={() => selectModule(module)}
                aria-current={active ? "step" : undefined}
              >
                <span className={styles.moduleNumber}>{module.code}</span>
                <div>
                  <strong>{module.title}</strong>
                  <small>{module.subtitle}</small>
                </div>
                <i className={styles.moduleState}>
                  {completed ? `${score}/100` : unlocked ? active ? "Aktif" : "Açık" : `Önce ${String(module.id - 1).padStart(2, "0")}`}
                </i>
              </button>
            );
          })}
        </div>
      </section>

      <section className={styles.moduleSummary}>
        <div>
          <span>{selectedModule.code} · {selectedModule.level}</span>
          <h2>{selectedModule.title}</h2>
          <p>{selectedModule.objective}</p>
        </div>
        <div className={styles.moduleMeta}>
          <article><small>Süre</small><strong>{selectedModule.duration}</strong></article>
          <article><small>Minimum başarı</small><strong>{selectedModule.minimumScore}/100</strong></article>
          <article><small>Hedef senaryo</small><strong>{selectedModule.scenarioTarget}</strong></article>
        </div>
        <div className={styles.integrationMap}>
          <div>
            <span>YATAY ENTEGRASYON</span>
            <p>{selectedModule.horizontalIntegration.join(" · ")}</p>
          </div>
          <div>
            <span>DİKEY ENTEGRASYON</span>
            <p>{selectedModule.verticalIntegration.join(" → ")}</p>
          </div>
        </div>
      </section>

      <section className={styles.simulationShell}>
        <div className={styles.simulationHeader}>
          <div>
            <span>AKTİF SENARYO · SENTETİK HASTA</span>
            <h2>Akut göğüs ağrısı → anterior STEMI → dinamik kötüleşme</h2>
          </div>
          <div className={styles.simulationClock}>
            <small>SİMÜLASYON ZAMANI</small>
            <strong>{String(elapsedMinutes).padStart(2, "0")}:00</strong>
          </div>
        </div>

        <div className={styles.simulationGrid}>
          <div className={styles.patientColumn}>
            <div className={styles.patientIdentity}>
              <span>{patientProfile.initials}</span>
              <div>
                <strong>{patientProfile.age} yaş · {patientProfile.sex}</strong>
                <small>{patientProfile.location}</small>
              </div>
              <i>Sentetik</i>
            </div>
            <PatientFigure
              key={`${selectedModuleId}-${selectedActionIds[selectedActionIds.length - 1] ?? "initial"}`}
              vitals={vitals}
              phase={phase}
              statement={selectedModule.patientStatement}
            />
            <VitalMonitor
              key={`${selectedModuleId}-${selectedActionIds[selectedActionIds.length - 1] ?? "initial"}-monitor`}
              vitals={vitals}
            />
            {selectedModuleId === 7 ? <TeamPanel selectedActionIds={selectedActionIds} /> : null}
          </div>

          <div className={styles.actionColumn}>
            <div className={styles.briefingCard}>
              <span>GÖREV</span>
              <p>{selectedModule.briefing}</p>
            </div>

            <div className={styles.actionMetrics}>
              <article><small>Canlı puan</small><strong>{runningScore}</strong></article>
              <article><small>Süre</small><strong>{elapsedMinutes} dk</strong></article>
              <article><small>Tetkik maliyeti</small><strong>{formatCurrency(financialCost)}</strong></article>
              <article><small>Kazanılan beceri</small><strong>{selectedActionIds.length}</strong></article>
            </div>

            <ArxivisualScenePanel context={arxivisualScene} module={selectedModule} />

            <section className={styles.taskRunner} aria-labelledby="task-runner-title">
              <div className={styles.taskRunnerHeader}>
                <div>
                  <span>ÇALIŞAN GÖREV AKIŞI</span>
                  <strong id="task-runner-title">
                    {nextRequiredAction ? `Sıradaki: ${nextRequiredAction.shortLabel}` : "Zorunlu görevler tamamlandı"}
                  </strong>
                </div>
                <b>{completedRequiredCount}/{requiredActions.length}</b>
              </div>
              <div className={styles.taskProgress}>
                <i style={{ width: `${(completedRequiredCount / requiredActions.length) * 100}%` }} />
              </div>
              <div className={styles.taskList}>
                {requiredActions.map((action) => {
                  const completed = selectedActionIds.includes(action.id);
                  const available = visibleAction(action, selectedActionIds, phase);
                  const unmet = action.requires?.some((required) => !selectedActionIds.includes(required)) ?? false;
                  const next = nextRequiredAction?.id === action.id;
                  return (
                    <button
                      type="button"
                      key={action.id}
                      className={`${completed ? styles.taskCompleted : ""} ${next ? styles.taskNext : ""}`}
                      disabled={completed || !available || unmet || Boolean(debrief)}
                      onClick={() => performAction(action)}
                    >
                      <i>{completed ? "✓" : next ? "→" : "·"}</i>
                      <span>
                        <strong>{action.shortLabel}</strong>
                        <small>{completed ? "Tamamlandı" : available && !unmet ? `${action.timeCost} dk · Uygula` : "Önceki faz bekleniyor"}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
              <p aria-live="polite">
                {selectedActionIds.length
                  ? `${selectedActionIds.length} karar işlendi. Hasta, monitör ve Manim sahnesi son karara göre güncellendi.`
                  : "Bir göreve dokun; karar sonucu hasta, vital monitör ve Manim panelinde birlikte görünür."}
              </p>
            </section>

            <div className={styles.actionGroups}>
              {actionGroups.map(([group, actions]) => (
                <section key={group}>
                  <div className={styles.actionGroupHeader}>
                    <span>{group}</span>
                    <small>{actions.length} seçenek</small>
                  </div>
                  <div className={styles.actionList}>
                    {actions.map((action) => {
                      const selected = selectedActionIds.includes(action.id);
                      const unmet = action.requires?.filter((required) => !selectedActionIds.includes(required)) ?? [];
                      return (
                        <button
                          type="button"
                          key={action.id}
                          className={`${styles.actionCard} ${styles[`safety-${action.safety}`]} ${selected ? styles.actionSelected : ""}`}
                          disabled={selected || unmet.length > 0 || Boolean(debrief)}
                          onClick={() => performAction(action)}
                        >
                          <div className={styles.actionCardTop}>
                            <span>{action.shortLabel}</span>
                            <i>{selected ? "Uygulandı" : `${action.timeCost} dk`}</i>
                          </div>
                          <strong>{action.label}</strong>
                          <p>{action.description}</p>
                          <div className={styles.actionCardMeta}>
                            <span>{action.score > 0 ? `+${action.score}` : action.score} puan</span>
                            {action.financialCost ? <span>{formatCurrency(action.financialCost)}</span> : null}
                            {action.diagnosticValue ? <span>Değer: {action.diagnosticValue}</span> : null}
                            {action.critical ? <b>Kritik</b> : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            {selectedModule.requiresRationale ? (
              <div className={styles.rationaleCard}>
                <label htmlFor="clinical-rationale">Klinik karar gerekçen</label>
                <textarea
                  id="clinical-rationale"
                  value={rationale}
                  onChange={(event) => setRationale(event.target.value.slice(0, 800))}
                  placeholder="Hangi bulgular kararını değiştirdi? Olasılıkları ve hasta güvenliği riskini nasıl değerlendirdin?"
                  disabled={Boolean(debrief)}
                />
                <small>{rationale.trim().length}/800 · 40 karakter ve üzeri açıklanabilirlik puanına katkı sağlar.</small>
              </div>
            ) : null}

            <button
              className={styles.evaluateButton}
              type="button"
              disabled={!canEvaluate || Boolean(debrief)}
              onClick={evaluateScenario}
            >
              {completedRequiredCount < requiredActions.length
                ? `Önce zorunlu görevleri tamamla (${completedRequiredCount}/${requiredActions.length})`
                : selectedModule.requiresRationale && rationale.trim().length < 40
                  ? "Önce klinik gerekçeyi tamamla"
                  : "Simülasyonu bitir ve debriefing'i aç"}
            </button>
          </div>

          <aside className={styles.notebookColumn}>
            <div className={styles.notebookHeader}>
              <span>KLİNİK NOT DEFTERİ</span>
              <strong>{selectedActionIds.length} karar</strong>
            </div>

            <section className={styles.patientDataCard}>
              <span>BAŞLANGIÇ VERİSİ</span>
              <p><strong>Yakınma:</strong> {patientProfile.complaint}</p>
              <p><strong>Görünüm:</strong> {patientProfile.appearance}</p>
              <p><strong>Öykü:</strong> {patientProfile.history}</p>
            </section>

            <section className={styles.revealCard}>
              <span>AÇILAN KLİNİK BİLGİLER</span>
              {reveals.length ? (
                <ol>
                  {reveals.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
                </ol>
              ) : (
                <p>Karar verdikçe olgu bilgileri burada açılacak.</p>
              )}
            </section>

            <section className={styles.timelineCard}>
              <span>KARAR ZAMAN ÇİZELGESİ</span>
              {timeline.length ? (
                <ol>
                  {timeline.map((entry) => (
                    <li key={`${entry.id}-${entry.minute}`} className={styles[`timeline-${entry.safety}`]}>
                      <time>{String(entry.minute).padStart(2, "0")}:00</time>
                      <div>
                        <strong>{entry.label}</strong>
                        <p>{entry.feedback}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p>İlk klinik kararını verdiğinde zaman çizelgesi başlayacak.</p>
              )}
            </section>

            <section className={styles.skillCard}>
              <span>MODÜL BECERİLERİ</span>
              <div>
                {selectedModule.skills.map((skill) => {
                  const gained = selectedModule.actions.some(
                    (action) => action.skill === skill && selectedActionIds.includes(action.id),
                  );
                  return <i className={gained ? styles.skillGained : ""} key={skill}>{skill}</i>;
                })}
              </div>
            </section>
          </aside>
        </div>
      </section>

      {debrief ? (
        <section className={`${styles.debriefSection} ${debrief.passed ? styles.debriefPassed : styles.debriefFailed}`}>
          <div className={styles.debriefTop}>
            <div>
              <span>DEBRIEFING & PERFORMANS ANALİZİ</span>
              <h2>{debrief.passed ? "Yeterlilik ölçütü karşılandı" : "Yeterlilik henüz karşılanmadı"}</h2>
              <p>
                Sonuç yalnız toplam puana dayanmaz; kritik kararlar, kaçırılan ipuçları,
                zamanlama, hasta güvenliği ve düşünme izi birlikte değerlendirilir.
              </p>
            </div>
            <div className={styles.finalScore}>
              <strong>{debrief.score}</strong>
              <span>/100</span>
              <small>Minimum {selectedModule.minimumScore}</small>
            </div>
          </div>

          <div className={styles.debriefMetrics}>
            <article><span>Zorunlu adım kapsaması</span><strong>%{debrief.coverage}</strong></article>
            <article><span>Zaman cezası</span><strong>-{debrief.timePenalty}</strong></article>
            <article><span>Gerekçe katkısı</span><strong>+{debrief.rationaleBonus}</strong></article>
            <article><span>Hasta güvenliği hatası</span><strong>{debrief.harmfulActions.filter((action) => action.safety === "critical").length}</strong></article>
          </div>

          <div className={styles.debriefGrid}>
            <article>
              <span>BURADA NE YAPTIN?</span>
              <h3>Doğru kararlar</h3>
              {debrief.positiveActions.length ? (
                <ul>{debrief.positiveActions.map((action) => <li key={action.id}>{action.shortLabel}: {action.rationale}</li>)}</ul>
              ) : <p>Olumlu klinik karar kaydı oluşmadı.</p>}
            </article>
            <article>
              <span>NE OLABİLİRDİ?</span>
              <h3>Kritik riskler ve kaçırılanlar</h3>
              {debrief.harmfulActions.length || debrief.missedRequired.length ? (
                <ul>
                  {debrief.harmfulActions.map((action) => <li key={action.id}>{action.shortLabel}: {action.feedback}</li>)}
                  {debrief.missedRequired.map((action) => <li key={`missed-${action.id}`}>Kaçırıldı — {action.shortLabel}: {action.rationale}</li>)}
                </ul>
              ) : <p>Kritik hata veya zorunlu adım eksiği saptanmadı.</p>}
            </article>
            <article>
              <span>UZMAN YAKLAŞIMI NE OLURDU?</span>
              <h3>Örnek uzman akışı</h3>
              <p>{selectedModule.expertApproach}</p>
            </article>
            <article>
              <span>BİR SONRAKİ DENEME</span>
              <h3>Değiştirmen gereken odak</h3>
              <p>{selectedModule.nextFocus}</p>
            </article>
          </div>

          <div className={styles.debriefActions}>
            <button type="button" onClick={() => resetScenario(selectedModule)}>Bu modülü yeniden dene</button>
            {debrief.passed && selectedModuleId < 8 ? (
              <button className={styles.continueButton} type="button" onClick={continueToNextModule}>
                {String(selectedModuleId + 1).padStart(2, "0")} numaralı modüle geç
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      <footer className={styles.footer}>
        <div>
          <strong>TEYS · Medikal Simülasyon</strong>
          <span>Gürsel Online Eğitim ve Bilgi Teknolojileri A.Ş. · Kontrollü ürün prototipi</span>
        </div>
        <b>Production: NO-GO · Gerçek hasta verisi kullanılmaz</b>
      </footer>
    </main>
  );
}
