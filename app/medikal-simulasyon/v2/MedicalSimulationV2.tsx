"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import {
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
  type SimulationMode,
  type ToolName,
} from "../../../services/medical-simulation-v2/engine.js";
import styles from "./simulation-v2.module.css";

const PatientRoom3D = dynamic(() => import("./PatientRoom3D"), {
  ssr: false,
  loading: () => <div className={styles.sceneLoading}>3B sentetik hasta sahnesi hazırlanıyor…</div>,
});

const STORAGE_KEY = "teys-stemi-v3-session";
const OBSERVER_NOTE_KEY = "teys-stemi-v3-observer-note";
const toolLabels: Record<ToolName, string> = {
  interview: "Hasta görüşmesi",
  exam: "Muayene",
  test: "Tetkikler",
  medication: "İlaçlar",
  intervention: "Müdahaleler",
  team: "Ekip",
};

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
  if (event.type === "ASK_PATIENT") return event.question || event.topic || "Hasta görüşmesi";
  if (event.type === "ADVANCE_TIME") return `${Math.round(event.seconds / 60)} dakika ilerle`;
  if (event.type === "REQUEST_VISUALIZATION") return "Manim işi oluştur";
  return "Manim iş sonucu";
}

function responseDetail(body: unknown, fallback: string) {
  if (body && typeof body === "object" && "detail" in body && typeof body.detail === "string") return body.detail;
  return fallback;
}

export default function MedicalSimulationV2() {
  const [session, setSession] = useState<ClinicalSession>(() => createSession({ mode: "training" }));
  const [activeTool, setActiveTool] = useState<ToolName>("interview");
  const [question, setQuestion] = useState("");
  const [examRegion, setExamRegion] = useState<"head" | "chest" | "arm">("chest");
  const [replayIndex, setReplayIndex] = useState<number | null>(null);
  const [renderState, setRenderState] = useState<"idle" | "submitting" | "rendering" | "ready" | "blocked" | "failed">("idle");
  const [renderMessage, setRenderMessage] = useState("Karar seçildiğinde olay kaydı arXivisual/Manim iş hattına gönderilebilir.");
  const [observerNote, setObserverNote] = useState("");
  const hydrated = useRef(false);
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setSession(restoreSession(stored));
      setObserverNote(window.localStorage.getItem(OBSERVER_NOTE_KEY) ?? "");
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

  const displaySession = useMemo(() => {
    if (replayIndex === null) return session;
    return replaySession(session.initial, session.records.slice(0, replayIndex + 1)).session;
  }, [replayIndex, session]);
  const state = displaySession.state;
  const liveState = session.state;
  const debrief = useMemo(() => buildDebrief(session), [session]);
  const actions = useMemo(() => getAvailableActions(liveState, activeTool), [activeTool, liveState]);
  const latestRecord = [...session.records].reverse().find((record) => record.accepted && record.tool !== "visualization") ?? null;
  const replayRecord = replayIndex === null ? null : session.records[replayIndex];
  const renderRecord = replayRecord?.accepted && replayRecord.tool !== "visualization" ? replayRecord : latestRecord;
  const visualization = [...session.state.visualizations].reverse()[0];
  const currentEvidence = renderRecord?.evidenceId ? UCEP_EVIDENCE[renderRecord.evidenceId] : null;
  const showMechanism = liveState.mode === "training" || liveState.status === "completed";
  const showScores = liveState.mode === "training" || liveState.status === "completed";

  function apply(event: ClinicalEvent) {
    setReplayIndex(null);
    setSession((current) => dispatchEvent(current, event));
  }

  function startMode(mode: SimulationMode) {
    if (mode === liveState.mode && session.records.length === 0) return;
    setSession(createSession({ mode, seed: liveState.seed }));
    setReplayIndex(null);
    setRenderState("idle");
    setRenderMessage(`${modeCopy[mode].title} modu için yeni sentetik oturum başlatıldı.`);
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
    setRenderMessage("Olay → doğrulama → Manim işi gönderiliyor…");
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
        setRenderMessage(reason);
        return;
      }
      const jobId = body && typeof body === "object" && "job_id" in body && typeof body.job_id === "string" ? body.job_id : null;
      if (!jobId) throw new Error("Render hizmeti geçerli bir job_id döndürmedi.");
      setRenderState("rendering");
      setRenderMessage(`Manim işi çalışıyor · ${jobId}`);
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
          setRenderMessage("Karara özel Manim sonucu olay kaydıyla doğrulandı.");
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
      setRenderMessage(reason);
    }
  }

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <a href="/medikal-simulasyon" className={styles.brand} aria-label="TEYS MAMS ana simülasyon sayfası">
          <span>TEYS / MAMS</span>
          <strong>Kanıt kapılı klinik simülasyon</strong>
        </a>
        <div className={styles.modePicker} aria-label="Simülasyon modu">
          {SIMULATION_MODES.map((mode) => (
            <button type="button" key={mode} aria-pressed={liveState.mode === mode} onClick={() => startMode(mode)}>
              {modeCopy[mode].title}
            </button>
          ))}
        </div>
        <div className={styles.runMeta}>
          <span>{liveState.status === "completed" ? "OTURUM TAMAMLANDI" : "SENTETİK HASTA · CANLI"}</span>
          <b>{formatClock(liveState.mode === "osce" ? liveState.osce.remainingSeconds : liveState.elapsedSeconds)}</b>
        </div>
      </header>

      <section className={styles.caseStrip} aria-label="Olgu özeti">
        <div><small>OLGU</small><strong>58 yaş · Erkek · Göğüs ağrısı</strong></div>
        <div><small>KLİNİK FAZ</small><strong>{phaseLabels[state.phase]}</strong></div>
        <div><small>MOD</small><strong>{modeCopy[liveState.mode].title}</strong><span>{modeCopy[liveState.mode].description}</span></div>
        {replayIndex !== null ? <button type="button" onClick={() => setReplayIndex(null)}>Canlı duruma dön</button> : null}
      </section>

      <section className={styles.clinicalWorkspace}>
        <div className={styles.sceneColumn}>
          <div className={styles.sceneFrame}>
            <PatientRoom3D
              state={state}
              onRegionSelect={(region) => {
                setExamRegion(region);
                setActiveTool("exam");
              }}
            />
            <aside className={styles.monitor} aria-label="Hasta monitörü" aria-live="polite">
              <div className={styles.monitorHead}><span>TEYS MONITOR</span><b>{state.vitals.rhythm.toUpperCase()}</b></div>
              <div className={styles.ecg} data-rhythm={state.vitals.rhythm}><i /><i /><i /><i /><i /></div>
              <div className={styles.vitalGrid}>
                <article><small>HR</small><strong>{state.vitals.heartRate}</strong><span>/dk</span></article>
                <article><small>SpO₂</small><strong>{state.vitals.spo2}</strong><span>%</span></article>
                <article><small>TA</small><strong>{state.vitals.systolic}/{state.vitals.diastolic}</strong><span>mmHg</span></article>
                <article><small>SS</small><strong>{state.vitals.respiratoryRate}</strong><span>/dk</span></article>
                <article><small>ISI</small><strong>{state.vitals.temperature.toFixed(1)}</strong><span>°C</span></article>
                <article><small>EtCO₂</small><strong>{state.vitals.etco2 ?? "—"}</strong><span>mmHg</span></article>
              </div>
            </aside>
            <div className={styles.patientSpeech}>
              <span>HASTA</span>
              <p>{state.lastMessage}</p>
            </div>
          </div>

          <div className={styles.phaseRail} aria-label="Klinik durum makinesi">
            {["assessment", "stemi", "treatment", "vf", "rosc", "handoff"].map((phase) => (
              <div key={phase} data-active={state.phase === phase} data-passed={Object.keys(phaseLabels).indexOf(state.phase) > Object.keys(phaseLabels).indexOf(phase)}>
                <i /> <span>{phaseLabels[phase]}</span>
              </div>
            ))}
          </div>

          <section className={styles.feedbackCard} data-safety={Boolean(session.records.at(-1)?.safetyAlert)} aria-live="polite">
            <div>
              <span>{session.records.at(-1)?.accepted === false ? "GEÇİŞ REDDEDİLDİ" : "SON KLİNİK SONUÇ"}</span>
              <strong>{liveState.lastMessage}</strong>
            </div>
            {showMechanism ? <p><b>Fizyolojik mekanizma:</b> {liveState.lastMechanism}</p> : <p>Gerekçe ve mekanizma, {liveState.mode === "osce" ? "istasyon" : "değerlendirme"} tamamlandığında açılır.</p>}
          </section>
        </div>

        <aside className={styles.toolDock} aria-label="Klinik araçlar">
          <div className={styles.toolTabs} role="tablist" aria-label="Araç grupları">
            {(Object.keys(toolLabels) as ToolName[]).map((tool) => (
              <button type="button" role="tab" aria-selected={activeTool === tool} key={tool} onClick={() => setActiveTool(tool)}>
                <span>{tool === "interview" ? "01" : tool === "exam" ? "02" : tool === "test" ? "03" : tool === "medication" ? "04" : tool === "intervention" ? "05" : "06"}</span>
                {toolLabels[tool]}
              </button>
            ))}
          </div>

          <div className={styles.toolPanel} role="tabpanel">
            <div className={styles.toolPanelHead}>
              <div><small>AKTİF ARAÇ</small><h2>{toolLabels[activeTool]}</h2></div>
              <span>{actions.filter((item) => item.available).length}/{actions.length} açık</span>
            </div>

            {activeTool === "interview" ? (
              <form className={styles.interviewForm} onSubmit={(event) => { event.preventDefault(); submitQuestion(); }}>
                <label htmlFor="patient-question">Hastaya kendi sorunuzu sorun</label>
                <div><input id="patient-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Örn. Ağrınız ne zaman başladı?" /><button type="submit" disabled={!question.trim()}>Sor</button></div>
                <small>Serbest metin, yerel ve deterministik niyet eşlemesiyle işlenir; AI görüşme hizmeti bağlı değildir.</small>
              </form>
            ) : null}

            {activeTool === "exam" ? (
              <div className={styles.regionNotice}><span>SEÇİLİ BÖLGE</span><strong>{examRegion === "head" ? "Baş / genel durum" : examRegion === "chest" ? "Göğüs" : "Periferik dolaşım"}</strong><small>3B hasta üzerindeki bölgeleri de seçebilirsiniz.</small></div>
            ) : null}

            <div className={styles.actionList}>
              {actions
                .filter((action) => activeTool !== "exam" || action.region === examRegion)
                .map((action) => (
                  <button
                    type="button"
                    key={action.id}
                    disabled={!action.available || replayIndex !== null}
                    title={action.reason || action.label}
                    onClick={() => apply(
                      activeTool === "interview" ? { type: "ASK_PATIENT", topic: action.id }
                        : activeTool === "exam" ? { type: "PERFORM_EXAM", actionId: action.id }
                          : activeTool === "test" ? { type: "ORDER_TEST", actionId: action.id }
                            : activeTool === "medication" ? { type: "ADMINISTER_MEDICATION", actionId: action.id }
                              : activeTool === "intervention" ? { type: "PERFORM_INTERVENTION", actionId: action.id }
                                : { type: "TEAM_ACTION", actionId: action.id }
                    )}
                  >
                    <span className={styles.actionState}>{action.available ? "UYGULA" : "KİLİTLİ"}</span>
                    <strong>{action.label}</strong>
                    <small>{action.technique ? `${action.region} · ${action.technique} · ` : ""}{formatClock(action.timeCostSeconds)}{action.cost ? ` · ₺${action.cost}` : ""}</small>
                    {!action.available ? <em>{action.reason}</em> : null}
                  </button>
                ))}
            </div>
            <div className={styles.observationTray} aria-live="polite">
              <span>ARAÇ ÇIKTISI</span>
              {activeTool === "interview" ? liveState.interview.slice(-2).map((item, index) => <p key={`${item.question}-${index}`}><b>{item.question}</b>{item.response}</p>) : null}
              {activeTool === "exam" ? liveState.examinations.filter((item) => item.region === examRegion).slice(-2).map((item, index) => <p key={`${item.id}-${index}`}><b>{item.technique}</b>{item.finding}</p>) : null}
              {activeTool === "test" ? liveState.orders.slice(-3).map((item) => <p key={item.id} data-ready={item.status === "ready"}><b>{item.label} · {item.status === "ready" ? "HAZIR" : `${formatClock(Math.max(0, item.readyAtSeconds - liveState.elapsedSeconds))} kaldı`}</b>{item.result ?? "Sonuç için klinik zamanı ilerletin."}</p>) : null}
              {activeTool === "medication" ? liveState.medications.slice(-3).map((item) => <p key={item.id} data-alert={item.contraindicated}><b>{TOOL_CATALOG.medication.find((action) => action.id === item.id)?.label} · {item.route}</b>{item.contraindicated ? "Kontrendikasyon güvenlik olayı kaydedildi." : `Protokol dozu: ${item.protocolDose}`}</p>) : null}
              {activeTool === "intervention" ? liveState.interventions.slice(-4).map((id) => <p key={id}><b>TAMAMLANDI</b>{TOOL_CATALOG.intervention.find((action) => action.id === id)?.label}</p>) : null}
              {activeTool === "team" ? liveState.teamActions.slice(-4).map((id) => <p key={id}><b>KAYITLI EKİP OLAYI</b>{TOOL_CATALOG.team.find((action) => action.id === id)?.label}</p>) : null}
              {activeTool === "interview" && liveState.interview.length === 0 || activeTool === "exam" && liveState.examinations.filter((item) => item.region === examRegion).length === 0 || activeTool === "test" && liveState.orders.length === 0 || activeTool === "medication" && liveState.medications.length === 0 || activeTool === "intervention" && liveState.interventions.length === 0 || activeTool === "team" && liveState.teamActions.length === 0 ? <small>Bu araçla henüz çıktı üretilmedi.</small> : null}
            </div>
            <div className={styles.timeControls}>
              <span>Klinik zamanı ilerlet</span>
              {[60, 180, 300].map((seconds) => <button type="button" key={seconds} onClick={() => apply({ type: "ADVANCE_TIME", seconds })} disabled={replayIndex !== null || liveState.status === "completed"}>+{seconds / 60} dk</button>)}
            </div>
          </div>
        </aside>
      </section>

      <section className={styles.lowerGrid}>
        <section className={styles.timelinePanel} aria-labelledby="timeline-title">
          <div className={styles.sectionHead}><div><span>OLAY KAYNAKLI</span><h2 id="timeline-title">Karar zaman çizelgesi ve replay</h2></div><b>{session.records.length} olay · {session.stateHash}</b></div>
          {session.records.length ? (
            <ol className={styles.timeline}>
              {session.records.map((record, index) => (
                <li key={record.id} data-accepted={record.accepted} data-active={replayIndex === index}>
                  <button type="button" onClick={() => setReplayIndex(index)}>
                    <time>{formatClock(record.simulationSecond)}</time>
                    <span><strong>{eventLabel(record)}</strong><small>{record.publicFeedback}</small></span>
                    <b>{record.accepted ? "KABUL" : "RED"}</b>
                  </button>
                </li>
              ))}
            </ol>
          ) : <p className={styles.emptyState}>İlk klinik karar verildiğinde değişmez olay kaydı burada başlayacak.</p>}
        </section>

        <section className={styles.manimPanel} aria-labelledby="manim-title">
          <div className={styles.sectionHead}><div><span>ARXIVISUAL / MANIM</span><h2 id="manim-title">Kararın sonucunu görselleştir</h2></div><b data-render-state={renderState}>{renderState.toUpperCase()}</b></div>
          <div className={styles.pipeline} aria-label="Görselleştirme işlem hattı"><span>Olay</span><i /><span>Doğrula</span><i /><span>Manim</span><i /><span>MP4</span></div>
          {visualization?.videoUrl ? (
            <video controls playsInline preload="metadata" src={visualization.videoUrl} aria-label="Karara özel Manim çıktısı">Tarayıcınız MP4 oynatmayı desteklemiyor.</video>
          ) : (
            <div className={styles.renderFallback} data-state={renderState}>
              <strong>{renderState === "blocked" ? "BLOCKED_EXTERNAL_ACCESS" : renderState === "failed" ? "RENDER_FAILED" : "Henüz üretilmiş video yok"}</strong>
              <p>{renderMessage}</p>
              {renderRecord ? <small>Hedef olay: {renderRecord.id} · {eventLabel(renderRecord)}</small> : <small>Önce bir klinik karar uygulayın.</small>}
            </div>
          )}
          <button className={styles.renderButton} type="button" disabled={!renderRecord || renderState === "submitting" || renderState === "rendering"} onClick={requestVisualization}>Kararı Manim ile açıkla</button>
          <p className={styles.disclosure}>Manim simülasyon motoru değildir. Hasta durumu önce XState ve fizyoloji motorunda hesaplanır; render yalnızca seçilen olayın sonucunu anlatır.</p>
        </section>

        <section className={styles.evidencePanel} aria-labelledby="evidence-title">
          <div className={styles.sectionHead}><div><span>KANIT KAPISI</span><h2 id="evidence-title">UÇEP ve TYÇ izlenebilirliği</h2></div><b>DOĞRULANMADI</b></div>
          <article>
            <span>UÇEP GÖREV EŞLEMESİ</span>
            <strong>{currentEvidence?.task ?? "Bir klinik olay seçildiğinde görev eşlemesi görünür."}</strong>
            <p>{currentEvidence?.source ?? "Kaynak lokasyonu bekleniyor."}</p>
            <small>Uygulama düzeyi: {currentEvidence?.practiceLevel ?? "DOĞRULANMADI"} · Onay: {currentEvidence?.status ?? "DOĞRULANMADI"}</small>
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
            <span>TYÇ BAĞLAMI</span>
            <strong>{TYC_EVIDENCE.knowledge}</strong>
            <p>{TYC_EVIDENCE.skill} · {TYC_EVIDENCE.competence}</p>
            <small>Resmî seviye yerleştirmesi: {TYC_EVIDENCE.officialPlacementStatus}</small>
          </article>
        </section>
      </section>

      <section className={styles.debriefPanel} aria-labelledby="debrief-title">
        <div className={styles.sectionHead}><div><span>EĞİTİCİ ANALİTİĞİ</span><h2 id="debrief-title">Debriefing ve yeterlilik görünümü</h2></div><b>{debrief.competencyMet ? "YETERLİLİK KARŞILANDI" : "HENÜZ KARŞILANMADI"}</b></div>
        {showScores ? (
          <div className={styles.debriefGrid}>
            <div className={styles.scoreGrid}>
              {Object.entries(debrief.dimensions).map(([key, value]) => <article key={key}><span>{key.replace(/([A-Z])/g, " $1")}</span><strong>{value}</strong><i style={{ width: `${value}%` }} /></article>)}
            </div>
            <ul className={styles.checklist}>{debrief.checklist.map((item) => <li key={item.label} data-passed={item.passed}><span>{item.passed ? "✓" : "○"}</span>{item.label}</li>)}</ul>
            <div className={styles.auditSummary}>
              <p><b>Kritik güvenlik olayı:</b> {debrief.criticalSafety.length}</p>
              <p><b>Replay edilebilir olay:</b> {debrief.replayableEvents}</p>
              <p><b>Son durum hash:</b> {debrief.finalHash}</p>
              <small>{debrief.note}</small>
              <label className={styles.observerNote} htmlFor="educator-observation">
                <span>Eğitici gözlem notu</span>
                <textarea id="educator-observation" value={observerNote} onChange={(event) => setObserverNote(event.target.value)} placeholder="Karar sırası, iletişim ve güvenlik gözlemini yazın…" />
                <small>Bu not klinik motoru değiştirmez; yalnız bu tarayıcıdaki eğitici gözlem alanında saklanır.</small>
              </label>
            </div>
          </div>
        ) : <div className={styles.lockedDebrief}>Puanlar, kontrol listesi ve ayrıntılı debriefing oturum tamamlandığında açılır. Olay günlüğü değerlendirme bütünlüğü için kaydedilmeye devam eder.</div>}
      </section>

      <footer className={styles.footer}>
        <span>TEYS/MAMS V2 · sentetik hasta · eğitim prototipi</span>
        <p><a href="/medikal-simulasyon/kaynak-mimarisi">40 deponun açık kaynak kullanım kütüğünü aç</a> · XState, three.js ve React Three Fiber runtime’da doğrudan kullanılır; “referans” entegrasyon anlamına gelmez.</p>
        <b>Üretim: NO-GO · Fizyoloji/UÇEP/TYÇ uzman onayı: DOĞRULANMADI</b>
      </footer>
    </main>
  );
}
