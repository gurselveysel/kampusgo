"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DIFFERENTIAL_OPTIONS,
  DIFFICULTY_PROFILES,
  ENCOUNTER_CATALOG,
  SIMULATION_MODES,
  TOOL_CATALOG,
  TYC_EVIDENCE,
  UCEP_EVIDENCE,
  buildDebrief,
  buildVisualizationRequest,
  createSession,
  dispatchEvent,
  getAvailableActions,
  replaySession,
  restoreSession,
  type AuditRecord,
  type ClinicalEvent,
  type ClinicalSession,
  type DifficultyId,
  type SimulationMode,
  type ToolName,
} from "../../../services/medical-simulation-v2/engine.js";
import BedsideMonitor from "./BedsideMonitor";
import ClinicalDiagnosticViewer from "./ClinicalDiagnosticViewer";
import CurriculumNavigator from "./CurriculumNavigator";
import {
  getCurriculumPeriod,
  getInstitutionModel,
  type CurriculumPeriodId,
  type InstitutionModelId,
} from "../../../services/medical-simulation-v2/curriculum-catalog.js";
import styles from "./simulation-v2.module.css";

const PatientRoom3D = dynamic(() => import("./PatientRoom3D"), {
  ssr: false,
  loading: () => <div className={styles.sceneLoading}>3B sentetik hasta sahnesi hazırlanıyor…</div>,
});

const STORAGE_KEY = "teys-stemi-bedside-v5-session";
const OBSERVER_NOTE_KEY = "teys-stemi-bedside-v5-observer-note";
const CURRICULUM_KEY = "teys-mams-v2-curriculum-context";
const toolLabels: Record<ToolName, string> = {
  interview: "Hasta görüşmesi",
  exam: "Muayene",
  test: "Tetkikler",
  medication: "İlaçlar",
  intervention: "Müdahaleler",
  team: "Ekip",
  reasoning: "Klinik gerekçe",
};

const EMPTY_REASONING = { problemRepresentation: "", differentials: [] as string[], workingDiagnosis: "", reassessmentPlan: "" };

const modeCopy: Record<SimulationMode, { title: string; description: string }> = {
  training: { title: "Eğitim", description: "Anlık klinik geri bildirim ve mekanizma açıklaması açıktır." },
  assessment: { title: "Değerlendirme", description: "Kararlar kaydedilir; mekanizma ve puanlar oturum sonunda açılır." },
  osce: { title: "OSCE", description: "15 dakikalık istasyon; kontrol listesi debriefing öncesi gizlidir." },
};

const phaseLabels: Record<string, string> = {
  assessment: "İlk değerlendirme",
  stemi: "STEMI tanı fazı",
  treatment: "Tedavi ve transfer",
  vf: "VF arrest",
  rosc: "ROSC sonrası bakım",
  handoff: "Klinik devir tamamlandı",
};

const scoreLabels: Record<string, string> = {
  informationGathering: "Bilgi toplama",
  clinicalReasoning: "Klinik akıl yürütme",
  treatment: "Tedavi",
  patientSafety: "Hasta güvenliği",
  teamwork: "Ekip çalışması",
  timeManagement: "Zaman yönetimi",
};

const bedsideActionPlan: Record<string, Array<{ tool: Exclude<ToolName, "reasoning" | "exam" | "interview">; id: string }>> = {
  assessment: [
    { tool: "intervention", id: "monitor_iv" },
    { tool: "test", id: "ecg" },
    { tool: "medication", id: "aspirin" },
    { tool: "intervention", id: "titrated_oxygen" },
  ],
  stemi: [
    { tool: "medication", id: "aspirin" },
    { tool: "medication", id: "heparin" },
    { tool: "intervention", id: "activate_cath" },
    { tool: "team", id: "cardiology_consult" },
  ],
  treatment: [
    { tool: "intervention", id: "activate_cath" },
    { tool: "intervention", id: "transfer_cath" },
    { tool: "team", id: "cardiology_consult" },
    { tool: "team", id: "assign_roles" },
  ],
  vf: [
    { tool: "intervention", id: "call_code" },
    { tool: "intervention", id: "start_cpr" },
    { tool: "intervention", id: "defibrillate" },
    { tool: "intervention", id: "resume_cpr" },
  ],
  rosc: [
    { tool: "intervention", id: "post_rosc" },
    { tool: "team", id: "assign_roles" },
    { tool: "team", id: "closed_loop" },
    { tool: "intervention", id: "handoff_sbar" },
  ],
  handoff: [
    { tool: "intervention", id: "post_rosc" },
    { tool: "team", id: "closed_loop" },
    { tool: "intervention", id: "handoff_sbar" },
  ],
};

function eventForAction(tool: ToolName, actionId: string): ClinicalEvent {
  if (tool === "interview") return { type: "ASK_PATIENT", topic: actionId };
  if (tool === "exam") return { type: "PERFORM_EXAM", actionId };
  if (tool === "test") return { type: "ORDER_TEST", actionId };
  if (tool === "medication") return { type: "ADMINISTER_MEDICATION", actionId };
  if (tool === "intervention") return { type: "PERFORM_INTERVENTION", actionId };
  if (tool === "team") return { type: "TEAM_ACTION", actionId };
  throw new Error("Klinik gerekçe, yapılandırılmış form üzerinden kaydedilmelidir.");
}

function formatClock(seconds: number) {
  const safe = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function eventLabel(record: AuditRecord) {
  const event = record.event;
  if ("actionId" in event) {
    const catalogue = TOOL_CATALOG[record.tool as ToolName] ?? [];
    return catalogue.find((item) => item.id === event.actionId)?.label ?? event.actionId;
  }
  if (event.type === "ASK_PATIENT") return event.question || TOOL_CATALOG.interview.find((item) => item.id === event.topic)?.label || "Hasta görüşmesi";
  if (event.type === "ADVANCE_TIME") return `${Math.round(event.seconds / 60)} dakika ilerle`;
  if (event.type === "DOCUMENT_REASONING") return "Klinik gerekçeyi revize et";
  if (event.type === "REQUEST_VISUALIZATION") return "Karar görselleştirmesi iste";
  return "Karar görselleştirmesi sonucu";
}

const renderStateLabels = {
  idle: "Hazır",
  submitting: "İstek alındı",
  rendering: "Hazırlanıyor",
  ready: "İzlemeye hazır",
  blocked: "Şu anda kullanılamıyor",
  failed: "Tamamlanamadı",
} as const;

function learnerText(value: string | null | undefined) {
  if (!value) return "Henüz klinik sonuç oluşmadı.";
  if (/BLOCKED_EXTERNAL_ACCESS|RENDER_FAILED|Manim|arXivisual|render|job_id|HTTP/i.test(value)) {
    return "Karar görselleştirmesi şu anda kullanılamıyor. Klinik simülasyon kesintisiz devam ediyor.";
  }
  return value
    .replace(/XState/gi, "klinik akış")
    .replace(/deterministik/gi, "aynı kararlarla aynı sonucu veren")
    .replace(/\bAPI\b/gi, "bağlı hizmet")
    .replace(/\bruntime\b/gi, "çalışma ortamı")
    .replace(/\bhash\b/gi, "bütünlük kaydı")
    .replace(/\breplay\b/gi, "yeniden inceleme");
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function VitalTrend({ data }: { data: ReturnType<typeof buildDebrief>["vitalTrend"] }) {
  const width = 520;
  const height = 176;
  const points = (key: "heartRate" | "systolic" | "spo2", max: number) => data.map((item, index) => {
    const x = data.length <= 1 ? 16 : 16 + (index / (data.length - 1)) * (width - 32);
    const y = height - 18 - (Math.max(0, Math.min(max, item[key])) / max) * (height - 36);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  if (data.length === 0) return <p className={styles.emptyState}>İlk karar sonrası vital eğilim burada çizilecek.</p>;
  return (
    <div className={styles.trendWrap}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Nabız, sistolik kan basıncı ve oksijen satürasyonu olay eğilimi">
        {[0, 1, 2, 3].map((line) => <line key={line} x1="16" x2={width - 16} y1={18 + line * 45} y2={18 + line * 45} />)}
        <polyline points={points("heartRate", 180)} data-series="hr" />
        <polyline points={points("systolic", 200)} data-series="bp" />
        <polyline points={points("spo2", 100)} data-series="spo2" />
      </svg>
      <div className={styles.trendLegend}><span data-series="hr">HR</span><span data-series="bp">Sistolik TA</span><span data-series="spo2">SpO₂</span><b>{data.length} karar anı</b></div>
    </div>
  );
}

function responseDetail(body: unknown, fallback: string) {
  if (body && typeof body === "object" && "detail" in body && typeof body.detail === "string") return body.detail;
  return fallback;
}

export default function MedicalSimulationV2() {
  const [session, setSession] = useState<ClinicalSession>(() => createSession({ mode: "training" }));
  const [encounterStarted, setEncounterStarted] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolName>("interview");
  const [reviewView, setReviewView] = useState<"history" | "trend" | "explanation" | "program">("history");
  const [question, setQuestion] = useState("");
  const [examRegion, setExamRegion] = useState<"head" | "chest" | "arm">("chest");
  const [replayIndex, setReplayIndex] = useState<number | null>(null);
  const [renderState, setRenderState] = useState<"idle" | "submitting" | "rendering" | "ready" | "blocked" | "failed">("idle");
  const [renderMessage, setRenderMessage] = useState("Bir klinik karar verdikten sonra kararın hasta üzerindeki etkisini görselleştirebilirsiniz.");
  const [observerNote, setObserverNote] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [curriculumOpen, setCurriculumOpen] = useState(false);
  const [curriculumPeriodId, setCurriculumPeriodId] = useState<CurriculumPeriodId>("d6");
  const [institutionModelId, setInstitutionModelId] = useState<InstitutionModelId>("national-core");
  const [reasoningDraft, setReasoningDraft] = useState(EMPTY_REASONING);
  const hydrated = useRef(false);
  const toolDockRef = useRef<HTMLElement>(null);
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const restored = restoreSession(stored);
        setSession(restored);
        setEncounterStarted(restored.records.length > 0);
      }
      setObserverNote(window.localStorage.getItem(OBSERVER_NOTE_KEY) ?? "");
      const curriculumStored = window.localStorage.getItem(CURRICULUM_KEY);
      if (curriculumStored) {
        const parsed = JSON.parse(curriculumStored) as { periodId?: CurriculumPeriodId; modelId?: InstitutionModelId };
        if (parsed.periodId) setCurriculumPeriodId(parsed.periodId);
        if (parsed.modelId) setInstitutionModelId(parsed.modelId);
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      hydrated.current = true;
      setStorageReady(true);
    }
  }, []);

  useEffect(() => {
    if (hydrated.current && storageReady) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }, [session, storageReady]);

  useEffect(() => {
    if (hydrated.current && storageReady) window.localStorage.setItem(OBSERVER_NOTE_KEY, observerNote);
  }, [observerNote, storageReady]);

  useEffect(() => {
    if (hydrated.current && storageReady) window.localStorage.setItem(CURRICULUM_KEY, JSON.stringify({ periodId: curriculumPeriodId, modelId: institutionModelId }));
  }, [curriculumPeriodId, institutionModelId, storageReady]);

  const displaySession = useMemo(() => {
    if (replayIndex === null) return session;
    return replaySession(session.initial, session.records.slice(0, replayIndex + 1)).session;
  }, [replayIndex, session]);
  const state = displaySession.state;
  const liveState = session.state;
  const debrief = useMemo(() => buildDebrief(session), [session]);
  const actions = useMemo(() => getAvailableActions(liveState, activeTool), [activeTool, liveState]);
  const bedsideActions = useMemo(() => (bedsideActionPlan[liveState.phase] ?? []).flatMap(({ tool, id }) => {
    const action = getAvailableActions(liveState, tool).find((candidate) => candidate.id === id);
    return action ? [{ ...action, tool }] : [];
  }), [liveState]);
  const latestRecord = [...session.records].reverse().find((record) => record.accepted && record.tool !== "visualization") ?? null;
  const replayRecord = replayIndex === null ? null : session.records[replayIndex];
  const renderRecord = replayRecord?.accepted && replayRecord.tool !== "visualization" ? replayRecord : latestRecord;
  const visualization = [...session.state.visualizations].reverse()[0];
  const currentEvidence = renderRecord?.evidenceId ? UCEP_EVIDENCE[renderRecord.evidenceId] : null;
  const showMechanism = liveState.mode === "training" || liveState.status === "completed";
  const hasClinicalActivity = session.records.some((record) => record.accepted && record.tool !== "visualization");
  const currentEncounter = ENCOUNTER_CATALOG.find((encounter) => encounter.id === liveState.encounterId) ?? ENCOUNTER_CATALOG[0];
  const curriculumPeriod = getCurriculumPeriod(curriculumPeriodId);
  const institutionModel = getInstitutionModel(institutionModelId);

  function apply(event: ClinicalEvent) {
    setEncounterStarted(true);
    setReplayIndex(null);
    setSession((current) => dispatchEvent(current, event));
  }

  function startMode(mode: SimulationMode) {
    setSession(createSession({ mode, seed: liveState.seed, encounterId: liveState.encounterId, difficulty: liveState.difficulty }));
    setReplayIndex(null);
    setEncounterStarted(false);
    setRenderState("idle");
    setReviewView("history");
    setRenderMessage(`${modeCopy[mode].title} modu için yeni sentetik oturum başlatıldı.`);
  }

  function startEncounter(encounterId: string, difficulty: DifficultyId = liveState.difficulty) {
    setSession(createSession({ mode: liveState.mode, seed: liveState.seed, encounterId, difficulty }));
    setReasoningDraft(EMPTY_REASONING);
    setReplayIndex(null);
    setEncounterStarted(false);
    setRenderState("idle");
    setReviewView("history");
    setRenderMessage("Yeni sentetik olgu için karar kaydı başlatılmaya hazır.");
    setLibraryOpen(false);
  }

  function beginEncounter() {
    setEncounterStarted(true);
    setActiveTool("interview");
    window.requestAnimationFrame(() => toolDockRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  }

  function submitReasoning() {
    apply({ type: "DOCUMENT_REASONING", ...reasoningDraft });
    setReasoningDraft(EMPTY_REASONING);
  }

  function downloadSessionReport() {
    const eventRows = session.records.map((record) => `<tr><td>${escapeHtml(formatClock(record.simulationSecond))}</td><td>${escapeHtml(eventLabel(record))}</td><td>${record.accepted ? "Kabul" : "Reddedildi"}</td><td>${escapeHtml(learnerText(record.publicFeedback))}</td></tr>`).join("");
    const report = `<!doctype html><html lang="tr"><meta charset="utf-8"><title>TEYS MAMS oturum değerlendirme raporu</title><style>body{font:16px/1.55 system-ui;max-width:1000px;margin:40px auto;padding:0 24px;color:#17313a}h1,h2{color:#075f68}table{width:100%;border-collapse:collapse}th,td{border:1px solid #b9cccf;padding:8px;text-align:left}small{color:#5e7378}</style><body><h1>TEYS / MAMS oturum değerlendirme raporu</h1><p><b>Olgu:</b> ${escapeHtml(liveState.encounterTitle)}<br><b>Program bağlamı:</b> ${escapeHtml(curriculumPeriod.label)} · ${escapeHtml(institutionModel.label)}<br><b>Mod:</b> ${escapeHtml(modeCopy[liveState.mode].title)}<br><b>Oturum süresi:</b> ${escapeHtml(formatClock(liveState.elapsedSeconds))}</p><h2>Sonuç</h2><p><b>Yeterlilik:</b> ${debrief.competencyMet ? "Karşılandı" : "Henüz karşılanmadı"}<br><b>Kritik güvenlik olayı:</b> ${debrief.criticalSafety.length}<br><b>Klinik gerekçe güncellemesi:</b> ${debrief.reasoningTrajectory.length}</p><h2>Karar geçmişi</h2><table><thead><tr><th>Zaman</th><th>Karar</th><th>Sonuç</th><th>Geri bildirim</th></tr></thead><tbody>${eventRows}</tbody></table><p><small>Sentetik eğitim ortamı. UÇEP/TYÇ eşlemeleri ile klinik içerik için uzman ve kurum onayları doğrulanmamıştır.</small></p></body></html>`;
    const url = URL.createObjectURL(new Blob([report], { type: "text/html;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${liveState.encounterId}-oturum-degerlendirme.html`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function submitQuestion() {
    const trimmed = question.trim();
    if (!trimmed) return;
    apply({ type: "ASK_PATIENT", question: trimmed });
    setQuestion("");
  }

  async function requestVisualization() {
    if (!renderRecord || renderState === "submitting" || renderState === "rendering") return;
    const visualizationId = `viz_${renderRecord.id}`;
    setSession((current) => dispatchEvent(current, { type: "REQUEST_VISUALIZATION", recordId: renderRecord.id }));
    setRenderState("submitting");
    setRenderMessage("Klinik karar doğrulanıyor ve açıklayıcı görsel hazırlanıyor…");
    try {
      const response = await fetch("/api/medical-simulation/jobs", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildVisualizationRequest(renderRecord, liveState)),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const reason = `BLOCKED_EXTERNAL_ACCESS · ${responseDetail(body, `HTTP ${response.status}`)}`;
        setSession((current) => dispatchEvent(current, { type: "VISUALIZATION_RESULT", visualizationId, status: "blocked", reason }));
        setRenderState("blocked");
        setRenderMessage("Görselleştirme hizmetine şu anda ulaşılamıyor. Hasta durumu ve diğer klinik araçlar çalışmaya devam ediyor.");
        return;
      }
      const jobId = body && typeof body === "object" && "job_id" in body && typeof body.job_id === "string" ? body.job_id : null;
      if (!jobId) throw new Error("Render hizmeti geçerli bir job_id döndürmedi.");
      setRenderState("rendering");
      setRenderMessage("Kararınıza özel açıklayıcı görsel hazırlanıyor…");
      for (let attempt = 0; attempt < 24; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 1250));
        const jobResponse = await fetch(`/api/medical-simulation/jobs/${encodeURIComponent(jobId)}`, { cache: "no-store" });
        const job: unknown = await jobResponse.json().catch(() => null);
        if (!jobResponse.ok) throw new Error(responseDetail(job, `İş durumu HTTP ${jobResponse.status}`));
        const status = job && typeof job === "object" && "status" in job ? String(job.status) : "unknown";
        if (["failed", "blocked"].includes(status)) throw new Error(responseDetail(job, `Render işi ${status}.`));
        if (status === "completed") {
          const resultResponse = await fetch(`/api/medical-simulation/jobs/${encodeURIComponent(jobId)}/result`, { cache: "no-store" });
          const result: unknown = await resultResponse.json().catch(() => null);
          if (!resultResponse.ok) throw new Error(responseDetail(result, `Sonuç HTTP ${resultResponse.status}`));
          const videoUrl = result && typeof result === "object" && "video_url" in result && typeof result.video_url === "string" ? result.video_url : null;
          if (!videoUrl) throw new Error("Render tamamlandı ancak video_url dönmedi.");
          setSession((current) => dispatchEvent(current, { type: "VISUALIZATION_RESULT", visualizationId, status: "ready", videoUrl }));
          setRenderState("ready");
          setRenderMessage("Kararınıza özel açıklayıcı görsel izlemeye hazır.");
          return;
        }
      }
      throw new Error("Render bekleme süresi doldu; iş daha sonra yeniden sorgulanmalıdır.");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Bilinmeyen render hatası";
      const reason = detail.includes("access") || detail.includes("Pilot")
        ? `BLOCKED_EXTERNAL_ACCESS · ${detail}`
        : `RENDER_FAILED · ${detail}`;
      setSession((current) => dispatchEvent(current, { type: "VISUALIZATION_RESULT", visualizationId, status: reason.startsWith("BLOCKED") ? "blocked" : "failed", reason }));
      setRenderState(reason.startsWith("BLOCKED") ? "blocked" : "failed");
      setRenderMessage("Görselleştirme tamamlanamadı. Klinik simülasyon kesintisiz devam ediyor.");
    }
  }

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <a href="/medikal-simulasyon" className={styles.brand} aria-label="TEYS MAMS ana simülasyon sayfası">
          <span>TEYS / MAMS</span>
          <strong>Klinik beceri simülasyonu</strong>
        </a>
        <div className={styles.modePicker} aria-label="Simülasyon modu">
          {SIMULATION_MODES.map((mode) => (
            <button type="button" key={mode} data-action-contract={`${modeCopy[mode].title} modunda yeni oturum başlatır`} disabled={liveState.mode === mode} aria-pressed={liveState.mode === mode} onClick={() => startMode(mode)}>
              {modeCopy[mode].title}
            </button>
          ))}
        </div>
        <div className={styles.runMeta}>
          <span>{liveState.status === "completed" ? "OTURUM TAMAMLANDI" : encounterStarted ? "KLİNİK SÜRE" : "OLGU HAZIR"}</span>
          <b>{formatClock(liveState.mode === "osce" ? liveState.osce.remainingSeconds : liveState.elapsedSeconds)}</b>
        </div>
      </header>

      <section className={styles.caseStrip} aria-label="Olgu özeti">
        <div><small>OLGU</small><strong>{state.patient.age} yaş · {state.patient.sex} · {state.encounterTitle}</strong><span>{currentEncounter.briefing}</span></div>
        <div><small>KLİNİK FAZ</small><strong>{phaseLabels[state.phase]}</strong></div>
        <div><small>EĞİTİM PROGRAMI</small><strong>{curriculumPeriod.label} · {institutionModel.label}</strong><span>{modeCopy[liveState.mode].title} · {DIFFICULTY_PROFILES[liveState.difficulty].label}</span></div>
        <div className={styles.caseActions}>
          {!encounterStarted ? <button className={styles.startAction} type="button" data-action-contract="Oturumu başlatır ve hasta görüşmesi aracını açar" onClick={beginEncounter}>Olguyu başlat</button> : null}
          <button type="button" data-action-contract="Olgu kütüphanesini açar veya kapatır" onClick={() => setLibraryOpen((value) => !value)} aria-expanded={libraryOpen}>Olgu kütüphanesi</button>
          <button type="button" data-action-contract="Altı yıllık program gezginini açar veya kapatır" onClick={() => setCurriculumOpen((value) => !value)} aria-expanded={curriculumOpen}>Müfredat</button>
          {replayIndex !== null ? <button type="button" data-action-contract="Geçmiş incelemesini kapatıp canlı hasta durumuna döner" onClick={() => setReplayIndex(null)}>Canlı duruma dön</button> : null}
        </div>
      </section>

      {curriculumOpen ? (
        <CurriculumNavigator
          encounterId={liveState.encounterId}
          selectedPeriodId={curriculumPeriodId}
          selectedModelId={institutionModelId}
          onClose={() => setCurriculumOpen(false)}
          onApply={(periodId, modelId) => {
            setCurriculumPeriodId(periodId);
            setInstitutionModelId(modelId);
            setCurriculumOpen(false);
          }}
        />
      ) : null}

      {libraryOpen ? (
        <section className={styles.libraryPanel} aria-labelledby="case-library-title">
          <div className={styles.libraryHead}>
            <div><span>ÇALIŞAN OLGU KATALOĞU</span><h2 id="case-library-title">Aynı klinik çekirdekte üç farklı başlangıç</h2><p>Hasta öyküsü, muayene, güvenlik tuzağı, rezerv ve bozulma zamanı seçime göre değişir.</p></div>
            <button type="button" data-action-contract="Olgu kütüphanesini kapatır" onClick={() => setLibraryOpen(false)} aria-label="Olgu kütüphanesini kapat">Kapat</button>
          </div>
          <div className={styles.difficultyPicker} aria-label="Zorluk profili">
            {Object.values(DIFFICULTY_PROFILES).map((profile) => (
              <button type="button" key={profile.id} data-action-contract={`${profile.label} zorlukta olguyu yeniden başlatır`} aria-pressed={liveState.difficulty === profile.id} onClick={() => startEncounter(liveState.encounterId, profile.id)}>
                <strong>{profile.label}</strong><span>{profile.description}</span>
              </button>
            ))}
          </div>
          <div className={styles.caseCatalog}>
            {ENCOUNTER_CATALOG.map((encounter) => (
              <article key={encounter.id} data-active={encounter.id === liveState.encounterId}>
                <div><span>{encounter.environment}</span><b>KULLANIMA HAZIR</b></div>
                <h3>{encounter.title}</h3>
                <p>{encounter.briefing}</p>
                <ul>{encounter.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul>
                <small>Uzman onayı: {encounter.expertApprovalStatus}</small>
                <button type="button" data-action-contract={`${encounter.title} olgusunu başlatır`} onClick={() => startEncounter(encounter.id)}>{encounter.id === liveState.encounterId ? "Olguyu yeniden başlat" : "Bu olguyu başlat"}</button>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className={styles.clinicalWorkspace}>
        <div className={styles.sceneColumn}>
          <div className={styles.sceneFrame}>
            <PatientRoom3D
              state={state}
              selectedRegion={examRegion}
              examModeActive={activeTool === "exam"}
              onRegionSelect={(region) => {
                setExamRegion(region);
                setActiveTool("exam");
              }}
            />
            <BedsideMonitor state={state} />
            <div className={styles.patientSpeech}>
              <span>HASTA</span>
              <p>{learnerText(state.lastMessage)}</p>
            </div>
            <section className={styles.bedsideCommands} aria-label="Yatak başı hızlı klinik eylemleri">
              <div><span>ŞİMDİ YAPILABİLECEKLER</span><b>{phaseLabels[liveState.phase]}</b></div>
              <div className={styles.bedsideActionGrid}>
                {bedsideActions.map((action) => (
                  <button
                    type="button"
                    key={`${action.tool}-${action.id}`}
                    data-testid={`bedside-action-${action.id}`}
                    data-tool={action.tool}
                    data-action-contract={`${action.label} klinik eylemini uygular ve hasta durumunu günceller`}
                    disabled={!action.available || replayIndex !== null}
                    title={action.reason || action.label}
                    onClick={() => {
                      setActiveTool(action.tool);
                      apply(eventForAction(action.tool, action.id));
                    }}
                  >
                    <span>{action.available ? "UYGULA" : "KİLİTLİ"}</span>
                    <strong>{action.label}</strong>
                    <small>{action.available ? formatClock(action.timeCostSeconds) : action.reason}</small>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <div className={styles.phaseRail} aria-label="Klinik durum makinesi">
            {["assessment", "stemi", "treatment", "vf", "rosc", "handoff"].map((phase) => (
              <div key={phase} data-active={state.phase === phase} data-passed={Object.keys(phaseLabels).indexOf(state.phase) > Object.keys(phaseLabels).indexOf(phase)}>
                <i /> <span>{phaseLabels[phase]}</span>
              </div>
            ))}
          </div>

          {hasClinicalActivity ? <section className={styles.feedbackCard} data-safety={Boolean(session.records.at(-1)?.safetyAlert)} aria-live="polite">
            <div>
              <span>{session.records.at(-1)?.accepted === false ? "GEÇİŞ REDDEDİLDİ" : "SON KLİNİK SONUÇ"}</span>
              <strong>{learnerText(liveState.lastMessage)}</strong>
            </div>
            {showMechanism ? <p><b>Fizyolojik mekanizma:</b> {learnerText(liveState.lastMechanism)}</p> : <p>Gerekçe ve mekanizma, {liveState.mode === "osce" ? "istasyon" : "değerlendirme"} tamamlandığında açılır.</p>}
          </section> : null}
        </div>

        <aside ref={toolDockRef} className={styles.toolDock} aria-label="Klinik araçlar">
          <div className={styles.toolTabs} role="tablist" aria-label="Araç grupları">
            {(Object.keys(toolLabels) as ToolName[]).map((tool, index) => (
              <button type="button" role="tab" data-action-contract={`${toolLabels[tool]} çalışma alanını açar`} disabled={activeTool === tool} aria-selected={activeTool === tool} key={tool} onClick={() => setActiveTool(tool)}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {toolLabels[tool]}
              </button>
            ))}
          </div>

          <div className={styles.toolPanel} role="tabpanel">
            <div className={styles.toolPanelHead}>
              <div><small>AKTİF ARAÇ</small><h2>{toolLabels[activeTool]}</h2></div>
              <span>{activeTool === "reasoning" ? `${liveState.reasoning.length} revizyon` : `${actions.filter((item) => item.available).length}/${actions.length} açık`}</span>
            </div>

            {activeTool === "interview" ? (
              <form className={styles.interviewForm} onSubmit={(event) => { event.preventDefault(); submitQuestion(); }}>
                <label htmlFor="patient-question">Hastaya kendi sorunuzu sorun</label>
                <div><input id="patient-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Örn. Ağrınız ne zaman başladı?" /><button type="submit" data-action-contract="Yazılan soruyu hastaya yöneltir ve yanıtı kaydeder" disabled={!question.trim()}>Sor</button></div>
                <small>Hasta, eğitim olgusunda tanımlı öykü bilgilerine göre yanıt verir. Yanıtlar yalnız bu sentetik olgu kapsamındadır.</small>
              </form>
            ) : null}

            {activeTool === "exam" ? (
              <div className={styles.regionNotice}><span>SEÇİLİ BÖLGE</span><strong>{examRegion === "head" ? "Baş / genel durum" : examRegion === "chest" ? "Göğüs" : "Periferik dolaşım"}</strong><small>3B hasta üzerindeki bölgeleri de seçebilirsiniz.</small></div>
            ) : null}

            {activeTool === "test" ? <ClinicalDiagnosticViewer state={liveState} /> : null}

            {activeTool === "reasoning" ? (
              <form className={styles.reasoningForm} onSubmit={(event) => { event.preventDefault(); submitReasoning(); }}>
                <label htmlFor="problem-representation"><span>Problem temsili</span><textarea id="problem-representation" value={reasoningDraft.problemRepresentation} onChange={(event) => setReasoningDraft((current) => ({ ...current, problemRepresentation: event.target.value }))} placeholder="Yaş, zaman seyri, kritik bulgular ve riskleri tek cümlede sentezleyin…" /></label>
                <fieldset>
                  <legend>Ayırıcı tanılar · en az iki</legend>
                  {DIFFERENTIAL_OPTIONS.map((option) => <label key={option.id}><input type="checkbox" checked={reasoningDraft.differentials.includes(option.id)} onChange={(event) => setReasoningDraft((current) => ({ ...current, differentials: event.target.checked ? [...current.differentials, option.id] : current.differentials.filter((id) => id !== option.id) }))} />{option.label}</label>)}
                </fieldset>
                <label htmlFor="working-diagnosis"><span>Çalışma tanısı</span><select id="working-diagnosis" value={reasoningDraft.workingDiagnosis} onChange={(event) => setReasoningDraft((current) => ({ ...current, workingDiagnosis: event.target.value }))}><option value="">Seçin</option>{DIFFERENTIAL_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
                <label htmlFor="reassessment-plan"><span>Yeniden değerlendirme planı</span><textarea id="reassessment-plan" value={reasoningDraft.reassessmentPlan} onChange={(event) => setReasoningDraft((current) => ({ ...current, reassessmentPlan: event.target.value }))} placeholder="Hangi bulguyu, ne zaman ve hangi eşikte yeniden değerlendireceksiniz?" /></label>
                <button type="submit" data-action-contract="Klinik gerekçeyi karar geçmişine yeni bir sürüm olarak kaydeder" disabled={replayIndex !== null || liveState.status === "completed"}>Klinik gerekçeyi kaydet · 01:30</button>
                <small>Her kayıt yeni bir değerlendirmedir; önceki gerekçe korunur. UÇEP eşlemesi uzman onayı olmadan DOĞRULANMADI kalır.</small>
              </form>
            ) : null}

            {activeTool !== "reasoning" ? <div className={styles.actionList}>
              {actions
                .filter((action) => activeTool !== "exam" || action.region === examRegion)
                .map((action) => (
                  <button
                    type="button"
                    key={action.id}
                    data-action-contract={`${action.label} klinik eylemini uygular ve sonucunu araç çıktısında gösterir`}
                    disabled={!action.available || replayIndex !== null}
                    title={action.reason || action.label}
                    onClick={() => apply(eventForAction(activeTool, action.id))}
                  >
                    <span className={styles.actionState}>{action.available ? "UYGULA" : "KİLİTLİ"}</span>
                    <strong>{action.label}</strong>
                    <small>{action.technique ? `${action.region} · ${action.technique} · ` : ""}{formatClock(action.timeCostSeconds)}{action.cost ? ` · ₺${action.cost}` : ""}</small>
                    {!action.available ? <em>{action.reason}</em> : null}
                  </button>
                ))}
            </div> : null}
            <div className={styles.observationTray} aria-live="polite">
              <span>ARAÇ ÇIKTISI</span>
              {activeTool === "interview" ? liveState.interview.slice(-2).map((item, index) => <p key={`${item.question}-${index}`}><b>{item.question}</b>{item.response}</p>) : null}
              {activeTool === "exam" ? liveState.examinations.filter((item) => item.region === examRegion).slice(-2).map((item, index) => <p key={`${item.id}-${index}`}><b>{item.technique}</b>{item.finding}</p>) : null}
              {activeTool === "test" ? liveState.orders.slice(-3).map((item) => <p key={item.id} data-ready={item.status === "ready"}><b>{item.label} · {item.status === "ready" ? "HAZIR" : `${formatClock(Math.max(0, item.readyAtSeconds - liveState.elapsedSeconds))} kaldı`}</b>{item.result ?? "Sonuç için klinik zamanı ilerletin."}</p>) : null}
              {activeTool === "medication" ? liveState.medications.slice(-3).map((item) => <p key={item.id} data-alert={item.contraindicated}><b>{TOOL_CATALOG.medication.find((action) => action.id === item.id)?.label} · {item.route}</b>{item.contraindicated ? "Kontrendikasyon güvenlik olayı kaydedildi." : `Protokol dozu: ${item.protocolDose}`}</p>) : null}
              {activeTool === "intervention" ? liveState.interventions.slice(-4).map((id) => <p key={id}><b>TAMAMLANDI</b>{TOOL_CATALOG.intervention.find((action) => action.id === id)?.label}</p>) : null}
              {activeTool === "team" ? liveState.teamActions.slice(-4).map((id) => <p key={id}><b>KAYITLI EKİP OLAYI</b>{TOOL_CATALOG.team.find((action) => action.id === id)?.label}</p>) : null}
              {activeTool === "reasoning" ? liveState.reasoning.slice(-2).map((item) => <p key={item.id}><b>{item.id} · {formatClock(item.atSeconds)}</b>{item.problemRepresentation}<br />Çalışma tanısı: {DIFFERENTIAL_OPTIONS.find((option) => option.id === item.workingDiagnosis)?.label}</p>) : null}
              {(activeTool === "interview" && liveState.interview.length === 0 || activeTool === "exam" && liveState.examinations.filter((item) => item.region === examRegion).length === 0 || activeTool === "test" && liveState.orders.length === 0 || activeTool === "medication" && liveState.medications.length === 0 || activeTool === "intervention" && liveState.interventions.length === 0 || activeTool === "team" && liveState.teamActions.length === 0 || activeTool === "reasoning" && liveState.reasoning.length === 0) ? <small>Bu araçla henüz çıktı üretilmedi.</small> : null}
            </div>
            <div className={styles.timeControls}>
              <span>Klinik zamanı ilerlet</span>
              {[60, 180, 300].map((seconds) => <button type="button" key={seconds} data-action-contract={`Klinik zamanı ${seconds / 60} dakika ilerletir ve hasta durumunu yeniden hesaplar`} onClick={() => apply({ type: "ADVANCE_TIME", seconds })} disabled={replayIndex !== null || liveState.status === "completed"}>+{seconds / 60} dk</button>)}
            </div>
          </div>
        </aside>
      </section>

      {hasClinicalActivity ? <section className={styles.reviewHub} aria-label="Oturum inceleme alanı">
        <nav className={styles.reviewTabs} aria-label="Oturum inceleme bölümleri">
          <button type="button" data-action-contract="Karar geçmişini gösterir" aria-pressed={reviewView === "history"} onClick={() => setReviewView("history")}><span>Kararlar</span><b>{session.records.length}</b></button>
          <button type="button" data-action-contract="Vital bulgu eğilimini gösterir" aria-pressed={reviewView === "trend"} onClick={() => setReviewView("trend")}><span>Hasta yanıtı</span><b>{debrief.vitalTrend.length}</b></button>
          <button type="button" data-action-contract="Seçili kararın görsel açıklamasını gösterir" aria-pressed={reviewView === "explanation"} onClick={() => setReviewView("explanation")}><span>Karar açıklaması</span><b>{visualization?.videoUrl ? "Hazır" : "Aç"}</b></button>
          <button type="button" data-action-contract="Seçili kararın eğitim programı ilişkisini gösterir" aria-pressed={reviewView === "program"} onClick={() => setReviewView("program")}><span>Program ilişkisi</span><b>{currentEvidence ? "1" : "—"}</b></button>
        </nav>

        {reviewView === "history" ? <section className={styles.timelinePanel} aria-labelledby="timeline-title">
          <div className={styles.sectionHead}><div><span>KARAR GEÇMİŞİ</span><h2 id="timeline-title">Kararları yeniden inceleyin</h2></div><b>{session.records.length} kayıt</b></div>
          {session.records.length ? (
            <ol className={styles.timeline}>
              {session.records.map((record, index) => (
                <li key={record.id} data-accepted={record.accepted} data-active={replayIndex === index}>
                  <button type="button" data-action-contract={`${formatClock(record.simulationSecond)} anındaki hasta durumunu gösterir`} disabled={replayIndex === index} onClick={() => setReplayIndex(index)}>
                    <time>{formatClock(record.simulationSecond)}</time>
                    <span><strong>{eventLabel(record)}</strong><small>{learnerText(record.publicFeedback)}</small></span>
                    <b>{record.accepted ? "KABUL" : "RED"}</b>
                  </button>
                </li>
              ))}
            </ol>
          ) : <p className={styles.emptyState}>İlk klinik karar verildiğinde karar geçmişi burada başlayacak.</p>}
        </section> : null}

        {reviewView === "trend" ? <section className={styles.trendPanel} aria-labelledby="trend-title">
          <div className={styles.sectionHead}><div><span>DİNAMİK HASTA YANITI</span><h2 id="trend-title">Karar bazlı vital eğilim</h2></div><b>{state.vitals.rhythm.toUpperCase()}</b></div>
          <VitalTrend data={debrief.vitalTrend} />
          <p className={styles.disclosure}>Nabız, sistolik tansiyon ve SpO₂; hastalığın seyri, geçen süre ve uyguladığınız klinik eylemler birlikte değerlendirilerek değişir.</p>
        </section> : null}

        {reviewView === "explanation" ? <section className={styles.manimPanel} aria-labelledby="manim-title">
          <div className={styles.sectionHead}><div><span>KARAR AÇIKLAMASI</span><h2 id="manim-title">Kararın hasta üzerindeki etkisini izleyin</h2></div><b data-render-state={renderState}>{renderStateLabels[renderState]}</b></div>
          <div className={styles.pipeline} aria-label="Görselleştirme adımları"><span>Karar</span><i /><span>Hasta yanıtı</span><i /><span>Açıklama</span><i /><span>İzle</span></div>
          {visualization?.videoUrl ? (
            <video controls playsInline preload="metadata" src={visualization.videoUrl} aria-label="Karara özel klinik açıklama videosu">Tarayıcınız videoyu oynatmayı desteklemiyor.</video>
          ) : (
            <div className={styles.renderFallback} data-state={renderState}>
              <strong>{renderStateLabels[renderState]}</strong>
              <p>{learnerText(renderMessage)}</p>
              {renderRecord ? <small>Seçili karar: {eventLabel(renderRecord)}</small> : <small>Önce bir klinik karar uygulayın.</small>}
            </div>
          )}
          <button className={styles.renderButton} type="button" data-action-contract="Seçili klinik karar için açıklayıcı görsel ister ve sonucu bu alanda gösterir" disabled={!renderRecord || renderState === "submitting" || renderState === "rendering"} onClick={requestVisualization}>Kararın etkisini görselleştir</button>
          <p className={styles.disclosure}>Görsel açıklama, daha önce hesaplanan hasta yanıtını anlatır; hasta durumunu değiştirmez. Hizmet kullanılamazsa simülasyon devam eder.</p>
        </section> : null}

        {reviewView === "program" ? <section className={styles.evidencePanel} aria-labelledby="evidence-title">
          <div className={styles.sectionHead}><div><span>KAYNAK VE ONAY</span><h2 id="evidence-title">UÇEP ve TYÇ ile ilişki</h2></div><b>UZMAN ONAYI BEKLİYOR</b></div>
          <article>
            <span>UÇEP GÖREV EŞLEMESİ</span>
            <strong>{currentEvidence?.task ?? "Bir klinik olay seçildiğinde görev eşlemesi görünür."}</strong>
            <p>{currentEvidence?.source ?? "Kaynak lokasyonu bekleniyor."}</p>
            <small>UÇEP uygulama düzeyi: {currentEvidence?.practiceLevel ?? "DOĞRULANMADI"} · Onay: {currentEvidence?.status ?? "DOĞRULANMADI"}</small>
            {currentEvidence ? <dl className={styles.evidenceDetails}>
              <div><dt>UÇEP sürümü</dt><dd>{currentEvidence.ucepVersion}</dd></div>
              <div><dt>Belirti / durum</dt><dd>{currentEvidence.symptomOrCondition}</dd></div>
              <div><dt>Öğrenme çıktısı</dt><dd>{currentEvidence.learningOutcome}</dd></div>
              <div><dt>Ölçme yöntemi</dt><dd>{currentEvidence.assessmentMethod}</dd></div>
              <div><dt>Gözlenebilir kanıt</dt><dd>{currentEvidence.observableEvidence}</dd></div>
              <div><dt>Uzman onayı / tarih</dt><dd>{currentEvidence.expertApprovalStatus} · {currentEvidence.expertApprovalDate ?? "DOĞRULANMADI"}</dd></div>
            </dl> : null}
          </article>
          <article>
            <span>TYÇ YETERLİLİK BOYUTLARI</span>
            <strong>{TYC_EVIDENCE.knowledge}</strong>
            <p>{TYC_EVIDENCE.skill} · {TYC_EVIDENCE.competence}</p>
            <small>UÇEP uygulama düzeyinden ayrı tutulur. Resmî program yerleştirmesi: {TYC_EVIDENCE.officialPlacementStatus}</small>
          </article>
        </section> : null}
      </section> : null}

      {liveState.status === "completed" ? <section className={styles.debriefPanel} aria-labelledby="debrief-title">
        <div className={styles.sectionHead}><div><span>EĞİTİCİ DEĞERLENDİRMESİ</span><h2 id="debrief-title">Oturum değerlendirmesi ve yeterlilik görünümü</h2></div><b>{debrief.competencyMet ? "YETERLİLİK KARŞILANDI" : "HENÜZ KARŞILANMADI"}</b></div>
        <div className={styles.debriefGrid}>
            <div className={styles.scoreGrid}>
              {Object.entries(debrief.dimensions).map(([key, value]) => <article key={key}><span>{scoreLabels[key] ?? key}</span><strong>{value}</strong><i style={{ width: `${value}%` }} /></article>)}
            </div>
            <ul className={styles.checklist}>{debrief.checklist.map((item) => <li key={item.label} data-passed={item.passed}><span>{item.passed ? "✓" : "○"}</span>{item.label}</li>)}</ul>
            <div className={styles.auditSummary}>
              <p><b>Kritik güvenlik olayı:</b> {debrief.criticalSafety.length}</p>
              <p><b>Yeniden incelenebilir karar:</b> {debrief.replayableEvents}</p>
              <p><b>Klinik gerekçe revizyonu:</b> {debrief.reasoningTrajectory.length}</p>
              {debrief.reasoningTrajectory.at(-1) ? <p><b>Son çalışma tanısı:</b> {DIFFERENTIAL_OPTIONS.find((option) => option.id === debrief.reasoningTrajectory.at(-1)?.workingDiagnosis)?.label ?? "—"}</p> : null}
              <button className={styles.exportButton} type="button" data-action-contract="Okunabilir oturum değerlendirme raporunu indirir" onClick={downloadSessionReport}>Oturum değerlendirme raporunu indir</button>
              <small>{learnerText(debrief.note)}</small>
              <label className={styles.observerNote} htmlFor="educator-observation">
                <span>Eğitici gözlem notu</span>
                <textarea id="educator-observation" value={observerNote} onChange={(event) => setObserverNote(event.target.value)} placeholder="Karar sırası, iletişim ve güvenlik gözlemini yazın…" />
                <small>Bu not hasta durumunu değiştirmez; yalnız bu cihazdaki eğitici gözlem alanında saklanır.</small>
              </label>
            </div>
        </div>
      </section> : null}

      <footer className={styles.footer}>
        <span>TEYS/MAMS · sentetik hasta · pilot değerlendirme sürümü</span>
        <p><a href="/medikal-simulasyon/kaynak-mimarisi">Açık kaynak kullanım ve lisans kayıtlarını inceleyin</a> · Kaynak listesinde bulunmak, bir bileşenin üründe çalıştığı anlamına gelmez.</p>
        <b>Genel kullanıma açık değil · Klinik içerik ve program eşlemeleri uzman/kurum onayı bekliyor</b>
      </footer>
    </main>
  );
}
