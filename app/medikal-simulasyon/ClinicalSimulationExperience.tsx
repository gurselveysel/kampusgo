"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import styles from "./clinical-simulation.module.css";
import {
  buildDebrief,
  createSession,
  getActionAvailability,
  replaySession,
  reduceSession,
  SIMULATION_MODES,
  TOOL_CATALOG,
  TYC_EVIDENCE,
  UCEP_EVIDENCE,
  type ClinicalEvent,
  type ClinicalSession,
  type SimulationMode,
  type ToolName,
} from "./clinical-engine.js";

const STORAGE_KEY = "teys-stemi-v2-session";

const toolMeta: Record<ToolName, { label: string; short: string; description: string }> = {
  interview: { label: "Hasta görüşmesi", short: "Görüşme", description: "Açık uçlu veya yapılandırılmış sorularla duruma bağlı bilgi aç." },
  exam: { label: "Fizik muayene", short: "Muayene", description: "Sistem ve teknik seç; pozitif/negatif bulguyu zaman maliyetiyle gör." },
  test: { label: "Tetkik ve görüntüleme", short: "Tetkik", description: "Sonuç süresi, maliyet ve klinik değeri olan istemler oluştur." },
  medication: { label: "İlaç", short: "İlaç", description: "Endikasyon ve kontrendikasyonları hasta durumuna karşı çalıştır." },
  intervention: { label: "Müdahale", short: "Müdahale", description: "Monitör, reperfüzyon, CPR, şok, ROSC ve devir akışını yönet." },
  team: { label: "Ekip ve konsültasyon", short: "Ekip", description: "Rol, kapalı döngü iletişim ve konsültasyon sorumluluğunu kaydet." },
};

const eventTypeForTool: Record<Exclude<ToolName, "interview">, ClinicalEvent["type"]> = {
  exam: "PERFORM_EXAM",
  test: "ORDER_TEST",
  medication: "ADMINISTER_MEDICATION",
  intervention: "PERFORM_INTERVENTION",
  team: "TEAM_ACTION",
};

const phaseLabels = {
  assessment: "İlk değerlendirme",
  stemi: "STEMI şüphesi",
  treatment: "Zaman kritik tedavi",
  vf: "VF kardiyak arrest",
  rosc: "ROSC sonrası bakım",
  handoff: "Klinik devir tamamlandı",
};

const modeLabels: Record<SimulationMode, string> = {
  training: "Eğitim",
  assessment: "Değerlendirme",
  osce: "OSCE",
};

function formatTime(seconds: number) {
  const minute = Math.floor(seconds / 60);
  const second = seconds % 60;
  return `${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(value);
}

function rhythmPath(rhythm: string) {
  if (rhythm === "vf") return "M0 55 C12 4 22 102 36 22 S58 98 72 12 S96 106 112 35 S138 2 154 82 S180 94 198 16 S224 108 246 38 S272 4 288 84 S318 96 338 18 S366 104 386 36 S414 4 432 84 S462 96 482 20 S510 104 530 38 S560 8 580 82 S610 96 640 28";
  if (rhythm === "stemi") return "M0 62 L30 62 L38 54 L45 62 L58 62 L65 24 L72 92 L80 44 L110 44 L126 38 L146 62 L178 62 L186 54 L193 62 L206 62 L213 24 L220 92 L228 44 L258 44 L274 38 L294 62 L326 62 L334 54 L341 62 L354 62 L361 24 L368 92 L376 44 L406 44 L422 38 L442 62 L474 62 L482 54 L489 62 L502 62 L509 24 L516 92 L524 44 L554 44 L570 38 L590 62 L640 62";
  return "M0 62 L35 62 L43 54 L50 62 L64 62 L71 25 L78 92 L85 62 L105 62 Q122 38 140 62 L178 62 L186 54 L193 62 L207 62 L214 25 L221 92 L228 62 L248 62 Q265 38 283 62 L326 62 L334 54 L341 62 L355 62 L362 25 L369 92 L376 62 L396 62 Q413 38 431 62 L474 62 L482 54 L489 62 L503 62 L510 25 L517 92 L524 62 L544 62 Q561 38 579 62 L640 62";
}

function Monitor({ session }: { session: ClinicalSession }) {
  const { vitals } = session.state;
  return (
    <section className={`${styles.monitor} ${vitals.rhythm === "vf" ? styles.monitorAlarm : ""}`} aria-label="Canlı hasta monitörü">
      <header>
        <span>CANLI SENTETİK MONİTÖR</span>
        <strong>{vitals.rhythm === "vf" ? "VENTRİKÜLER FİBRİLASYON" : vitals.rhythm === "stemi" ? "ST YÜKSELMESİ" : vitals.rhythm === "post-ischemic" ? "ORGANİZE RİTİM" : "SİNÜS RİTMİ"}</strong>
      </header>
      <svg viewBox="0 0 640 112" role="img" aria-label={`${vitals.rhythm} ritim dalgası`}>
        <g aria-hidden="true">
          {Array.from({ length: 13 }).map((_, index) => <line key={`v${index}`} x1={index * 54} x2={index * 54} y1="0" y2="112" />)}
          {Array.from({ length: 5 }).map((_, index) => <line key={`h${index}`} x1="0" x2="640" y1={index * 28} y2={index * 28} />)}
        </g>
        <path className={styles.traceGlow} d={rhythmPath(vitals.rhythm)} />
        <path className={styles.trace} d={rhythmPath(vitals.rhythm)} />
      </svg>
      <div className={styles.vitalGrid}>
        <article><span>HR</span><strong>{vitals.heartRate || "—"}</strong><small>/dk</small></article>
        <article><span>SpO₂</span><strong>{vitals.spo2 || "—"}</strong><small>%</small></article>
        <article><span>TA</span><strong>{vitals.systolic || "—"}/{vitals.diastolic || "—"}</strong><small>mmHg</small></article>
        <article><span>SS</span><strong>{vitals.respiratoryRate || "—"}</strong><small>/dk</small></article>
        <article><span>EtCO₂</span><strong>{vitals.etco2 ?? "—"}</strong><small>mmHg</small></article>
        <article><span>Isı</span><strong>{vitals.temperature.toFixed(1)}</strong><small>°C</small></article>
      </div>
    </section>
  );
}

function PatientScene({ session }: { session: ClinicalSession }) {
  const { state } = session;
  const critical = state.phase === "vf" || state.vitals.systolic < 80;
  return (
    <section className={`${styles.patientScene} ${critical ? styles.patientCritical : ""}`} aria-label="Duruma bağlı sentetik hasta">
      <div className={styles.sceneStatus}>
        <span>{phaseLabels[state.phase]}</span>
        <strong>{state.status === "completed" ? "DEVREDİLDİ" : critical ? "KRİTİK" : "AKTİF"}</strong>
      </div>
      <div className={styles.speech}>{state.phase === "vf" ? "Hasta yanıtsız." : state.phase === "rosc" ? "Neredeyim?" : state.patient.chiefComplaint}</div>
      <div className={styles.patientVisual} role="img" aria-label={critical ? "Kritik durumdaki sentetik hasta figürü" : "Solunum hareketi gösteren sentetik hasta figürü"}>
        <span className={styles.head}><i /><b /></span>
        <span className={styles.torso}><i /></span>
        <span className={styles.armLeft} />
        <span className={styles.armRight} />
        <span className={styles.blanket} />
      </div>
      <footer>
        <span>Sentetik hasta: {state.patient.id}</span>
        <strong>{state.patient.age} yaş · {state.patient.sex}</strong>
      </footer>
    </section>
  );
}

function ActionButton({
  session,
  tool,
  action,
  onAction,
}: {
  session: ClinicalSession;
  tool: Exclude<ToolName, "interview">;
  action: (typeof TOOL_CATALOG)[ToolName][number];
  onAction: (event: ClinicalEvent) => void;
}) {
  const availability = getActionAvailability(session.state, tool, action.id);
  const eventType = eventTypeForTool[tool];
  return (
    <button
      type="button"
      className={styles.actionButton}
      disabled={!availability.available}
      title={session.state.mode === "osce" ? undefined : availability.reason}
      onClick={() => onAction({ type: eventType, actionId: action.id } as ClinicalEvent)}
    >
      <span>{action.label}</span>
      <small>
        {action.minutes} dk
        {"cost" in action && action.cost ? ` · ${formatCurrency(action.cost)}` : ""}
        {"readyMinutes" in action && action.readyMinutes ? ` · sonuç ${action.readyMinutes} dk` : ""}
      </small>
      {!availability.available && session.state.mode !== "osce" ? <i>{availability.reason}</i> : null}
    </button>
  );
}

function ToolWorkspace({ session, activeTool, onEvent }: { session: ClinicalSession; activeTool: ToolName; onEvent: (event: ClinicalEvent) => void }) {
  const [question, setQuestion] = useState("");

  function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = question.trim();
    if (!value) return;
    onEvent({ type: "ASK_PATIENT", question: value });
    setQuestion("");
  }

  return (
    <section className={styles.toolWorkspace} aria-labelledby="tool-title">
      <header>
        <div>
          <span>ÇALIŞAN KLİNİK ARAÇ</span>
          <h2 id="tool-title">{toolMeta[activeTool].label}</h2>
        </div>
        <p>{toolMeta[activeTool].description}</p>
      </header>

      {activeTool === "interview" ? (
        <div className={styles.interviewWorkspace}>
          <form onSubmit={submitQuestion}>
            <label htmlFor="patient-question">Hastaya kendi sorunuzu yazın</label>
            <div>
              <input id="patient-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Örn. Ağrı ne zaman başladı ve nereye yayılıyor?" disabled={session.state.phase === "vf" || session.state.status === "completed"} />
              <button type="submit" disabled={!question.trim() || session.state.phase === "vf" || session.state.status === "completed"}>Sor</button>
            </div>
          </form>
          <div className={styles.quickActions} aria-label="Yapılandırılmış görüşme soruları">
            {TOOL_CATALOG.interview.map((action) => {
              const unavailable = session.state.phase === "vf" || session.state.status === "completed";
              return <button type="button" key={action.id} disabled={unavailable} onClick={() => onEvent({ type: "ASK_PATIENT", topic: action.id })}>{action.label}<small>{action.minutes} dk</small></button>;
            })}
          </div>
          <div className={styles.transcript} aria-live="polite">
            {session.state.interview.length ? session.state.interview.slice().reverse().map((entry, index) => (
              <article key={`${entry.topic}-${index}`}>
                <span>Siz</span><p>{entry.question}</p>
                <span>Hasta</span><p>{entry.response}</p>
                {entry.repeated ? <small>Tekrarlanan soru · yeni bilgi yok</small> : null}
              </article>
            )) : <div className={styles.emptyState}>Henüz soru sorulmadı. Açık uçlu metin alanı gerçekten çalışır ve soruyu klinik konuya göre sınıflandırır.</div>}
          </div>
        </div>
      ) : null}

      {activeTool !== "interview" ? (
        <div className={styles.actionGrid}>
          {TOOL_CATALOG[activeTool].map((action) => <ActionButton key={action.id} session={session} tool={activeTool} action={action} onAction={onEvent} />)}
        </div>
      ) : null}

      {activeTool === "exam" ? (
        <div className={styles.resultsList}>
          {session.state.examinations.length ? session.state.examinations.map((id) => {
            const record = [...session.records].reverse().find((item) => item.event.type === "PERFORM_EXAM" && item.event.actionId === id);
            return <article key={id}><span>MUAYENE BULGUSU</span><p>{record?.actualEffect}</p></article>;
          }) : <div className={styles.emptyState}>Muayene tekniği seçildiğinde bulgu burada görünür.</div>}
        </div>
      ) : null}

      {activeTool === "test" ? (
        <div className={styles.resultsList}>
          {session.state.orders.length ? session.state.orders.map((order) => (
            <article key={order.id} className={order.status === "ready" ? styles.resultReady : ""}>
              <span>{order.status === "ready" ? "SONUÇ HAZIR" : `BEKLENİYOR · ${formatTime(Math.max(0, order.readyAtSeconds - session.state.elapsedSeconds))}`}</span>
              <strong>{order.label}</strong>
              <p>{order.result ?? `İstem ${formatTime(order.orderedAtSeconds)} · ${formatCurrency(order.cost)}`}</p>
            </article>
          )) : <div className={styles.emptyState}>Tetkikler anında sonuç vermez; simülasyon saati ve maliyetle birlikte çalışır.</div>}
        </div>
      ) : null}

      {activeTool === "medication" && session.state.safetyEvents.length ? (
        <div className={styles.safetyList} role="alert">
          {session.state.safetyEvents.map((event, index) => <article key={`${event.code}-${index}`}><strong>{event.severity.toLocaleUpperCase("tr-TR")}</strong><span>{event.message}</span></article>)}
        </div>
      ) : null}
    </section>
  );
}

function PhysiologyPanel({ session }: { session: ClinicalSession }) {
  const { physiology } = session.state;
  const dimensions = [
    ["İskemi yükü", physiology.ischemiaBurden, true],
    ["Elektriksel instabilite", physiology.electricalInstability, true],
    ["Perfüzyon", physiology.perfusion, false],
    ["Oksijen rezervi", physiology.oxygenReserve, false],
  ] as const;
  return (
    <section className={styles.physiologyPanel} aria-labelledby="physiology-title">
      <header><span>DALLANAN FİZYOLOJİ</span><h3 id="physiology-title">Vital değerler bu durumdan türetilir</h3></header>
      {dimensions.map(([label, value, inverse]) => (
        <div key={label}>
          <span>{label}</span><strong>%{Math.round(value * 100)}</strong>
          <i><b className={inverse ? styles.riskBar : styles.healthBar} style={{ width: `${Math.round(value * 100)}%` }} /></i>
        </div>
      ))}
      <p>{session.state.lastMechanism}</p>
      <small>Motor doğrulama düzeyi: sentetik eğitim prototipi · Klinik doğruluk: DOĞRULANMADI</small>
    </section>
  );
}

function ManimExplanation({ session }: { session: ClinicalSession }) {
  const [failed, setFailed] = useState(false);
  const [showText, setShowText] = useState(false);
  const latest = session.records.at(-1);
  const scene = session.state.phase === "vf" || session.state.phase === "rosc"
    ? { src: "/medical-simulation/manim/module-06-emergency.mp4", title: "VF → CPR → şok → ROSC" }
    : session.state.flags.ecgReady
      ? { src: "/medical-simulation/manim/module-04-diagnostics.mp4", title: "EKG ve zaman kritik karar" }
      : { src: "/medical-simulation/manim/module-01-virtual-patient.mp4", title: "İlk değerlendirme ve görünür risk" };

  useEffect(() => setFailed(false), [scene.src]);

  return (
    <section className={styles.manimPanel} aria-labelledby="manim-title">
      <header>
        <div><span>MANIM AÇIKLAMA KATMANI</span><h3 id="manim-title">{scene.title}</h3></div>
        <i>Motor değil · fallback var</i>
      </header>
      {!failed ? (
        <video key={`${scene.src}-${latest?.id ?? "initial"}`} controls autoPlay muted playsInline preload="metadata" src={scene.src} onError={() => setFailed(true)}>
          Tarayıcınız videoyu oynatamıyor; metin alternatifi aşağıdadır.
        </video>
      ) : (
        <div className={styles.manimFallback} role="status">
          <strong>Görselleştirme yüklenemedi; simülasyon çalışmaya devam ediyor.</strong>
          <p>{latest?.mechanism ?? session.state.lastMechanism}</p>
        </div>
      )}
      <button type="button" className={styles.textFallbackButton} onClick={() => setShowText((current) => !current)} aria-expanded={showText}>
        {showText ? "Metin açıklamasını kapat" : "Erişilebilir metin açıklamasını aç"}
      </button>
      {showText ? <p className={styles.textFallback}>{latest?.mechanism ?? session.state.lastMechanism}</p> : null}
      <footer>Manim yalnız kararın sonucunu açıklar. Hasta durumunu olay/durum ve fizyoloji motoru belirler.</footer>
    </section>
  );
}

function EvidencePanel({ session }: { session: ClinicalSession }) {
  const latestEvidenceId = [...session.records].reverse().find((record) => record.evidenceId)?.evidenceId;
  const evidence = UCEP_EVIDENCE.find((item) => item.id === latestEvidenceId) ?? UCEP_EVIDENCE[0];
  return (
    <section className={styles.evidencePanel} aria-labelledby="evidence-title">
      <header><span>UÇEP / TYÇ KANIT KARTI</span><h3 id="evidence-title">Aynı rozet değil, ayrı kanıt alanları</h3></header>
      <div className={styles.evidenceGrid}>
        <article>
          <span>UÇEP ADAY EŞLEME</span>
          <strong>{evidence.task}</strong>
          <p>{evidence.practice}</p>
          <dl>
            <div><dt>Uygulama düzeyi</dt><dd>{evidence.practiceLevel ?? "Klinik problem düzeyi"}</dd></div>
            {evidence.learningLevel ? <div><dt>Öğrenme düzeyi</dt><dd>{evidence.learningLevel}</dd></div> : null}
            <div><dt>Kaynak</dt><dd>{evidence.source}, s. {evidence.sourcePage}</dd></div>
            <div><dt>Uzman onayı</dt><dd className={styles.unverified}>{evidence.status}</dd></div>
          </dl>
        </article>
        <article>
          <span>TYÇ BAĞLAMI</span>
          <strong>Bilgi · Beceri · Yetkinlik</strong>
          <p>{TYC_EVIDENCE.knowledge}</p>
          <p>{TYC_EVIDENCE.skill}</p>
          <p>{TYC_EVIDENCE.competence}</p>
          <dl><div><dt>Sayısal seviye</dt><dd>Atanmadı</dd></div><div><dt>Resmî yerleştirme</dt><dd className={styles.unverified}>{TYC_EVIDENCE.officialPlacementStatus}</dd></div></dl>
        </article>
      </div>
    </section>
  );
}

function Timeline({ session }: { session: ClinicalSession }) {
  const [replayStatus, setReplayStatus] = useState<string | null>(null);
  function runReplay() {
    const result = replaySession(session.initial, session.records);
    setReplayStatus(result.matches ? `Eşleşti · ${result.finalHash}` : `UYUŞMAZLIK · ${result.finalHash}`);
  }
  return (
    <section className={styles.timelinePanel} aria-labelledby="timeline-title">
      <header>
        <div><span>OLAY GÜNLÜĞÜ</span><h3 id="timeline-title">Karar → önceki hash → sonraki hash</h3></div>
        <button type="button" onClick={runReplay} disabled={!session.records.length}>Deterministik replay</button>
      </header>
      {replayStatus ? <p className={styles.replayStatus} role="status">{replayStatus}</p> : null}
      <div className={styles.timelineList}>
        {session.records.length ? session.records.slice().reverse().map((record) => (
          <article key={record.id} className={record.accepted ? "" : styles.rejectedEvent}>
            <div><strong>{record.id}</strong><span>{formatTime(record.simulationSecond)}</span><i>{record.accepted ? "KABUL" : "RED"}</i></div>
            <p>{record.publicFeedback}</p>
            <small>{record.previousHash} → {record.nextHash}</small>
            {record.safetyAlert ? <b>{record.safetyAlert}</b> : null}
          </article>
        )) : <div className={styles.emptyState}>İlk kararınız, önce/sonra hash ve rubrik etkisiyle burada kaydedilir.</div>}
      </div>
    </section>
  );
}

function Analytics({ session }: { session: ClinicalSession }) {
  const debrief = useMemo(() => buildDebrief(session), [session]);
  const dimensionLabels: Record<string, string> = {
    informationGathering: "Bilgi toplama",
    clinicalReasoning: "Klinik akıl yürütme",
    treatment: "Tedavi",
    patientSafety: "Hasta güvenliği",
    teamwork: "Ekip çalışması",
    timeManagement: "Zaman yönetimi",
  };
  return (
    <section className={styles.analytics} aria-labelledby="analytics-title">
      <header><span>EĞİTİCİ ANALİTİĞİ</span><h2 id="analytics-title">Tek toplam puan yerine gözlenebilir boyutlar</h2></header>
      <div className={styles.dimensionGrid}>
        {Object.entries(debrief.dimensions).map(([key, value]) => <article key={key}><span>{dimensionLabels[key]}</span><strong>{value}</strong><i><b style={{ width: `${value}%` }} /></i></article>)}
      </div>
      <div className={styles.analyticsGrid}>
        <article><span>Karar sayısı</span><strong>{session.records.length}</strong><small>{session.records.filter((record) => !record.accepted).length} reddedilen geçiş</small></article>
        <article><span>Güvenlik olayı</span><strong>{session.state.safetyEvents.length}</strong><small>{debrief.criticalSafety.length} kritik</small></article>
        <article><span>Sentetik maliyet</span><strong>{formatCurrency(session.state.financialCost)}</strong><small>{session.state.orders.length} tetkik</small></article>
        <article><span>Replay hash</span><strong>{debrief.finalHash}</strong><small>{debrief.replayableEvents} olay</small></article>
      </div>
      <div className={styles.checklist}>
        {debrief.checklist.map((item) => <div key={item.label}><span aria-hidden="true">{item.passed ? "✓" : "○"}</span><p>{item.label}</p><strong>{item.passed ? "Kanıtlandı" : "Eksik"}</strong></div>)}
      </div>
      {debrief.criticalDelays.length ? <div className={styles.debriefList}><h3>Kritik zaman olayları</h3><ul>{debrief.criticalDelays.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
      {debrief.unnecessaryActions.length ? <div className={styles.debriefList}><h3>Gereksiz/tekrarlı adımlar</h3><ul>{debrief.unnecessaryActions.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></div> : null}
      <footer className={debrief.competencyMet ? styles.competencyMet : styles.competencyPending}>
        <strong>{debrief.competencyMet ? "Pilot rubrik kapısı karşılandı" : "Pilot rubrik kapısı henüz karşılanmadı"}</strong>
        <p>{debrief.note}</p>
      </footer>
    </section>
  );
}

export default function ClinicalSimulationExperience() {
  const [session, setSession] = useState<ClinicalSession>(() => createSession({ mode: "training", seed: 20260827 }));
  const [activeTool, setActiveTool] = useState<ToolName>("interview");
  const [workspaceView, setWorkspaceView] = useState<"student" | "analytics">("student");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ClinicalSession;
        if (parsed?.state?.version === session.state.version && Array.isArray(parsed.records)) setSession(parsed);
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, [session.state.version]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // The simulation remains usable when storage is unavailable or full.
    }
  }, [hydrated, session]);

  function dispatch(event: ClinicalEvent) {
    setSession((current) => reduceSession(current, event));
  }

  function reset(mode: SimulationMode = session.state.mode) {
    const next = createSession({ mode, seed: 20260827 });
    setSession(next);
    setActiveTool("interview");
    setWorkspaceView("student");
    window.localStorage.removeItem(STORAGE_KEY);
  }

  const latest = session.records.at(-1);
  const showRealtimeExplanation = session.state.mode === "training";

  return (
    <main className={styles.page} id="clinical-simulation-v2">
      <header className={styles.topbar}>
        <a href="#clinical-simulation-v2" className={styles.brand}><b>TEYS</b><span>Tıp Eğitimi Yönetim Sistemi<small>MAMS · Uçtan uca sanal hasta</small></span></a>
        <div className={styles.statusPills}><span>Sentetik veri</span><span>Production NO-GO</span><span>Uzman onayı: DOĞRULANMADI</span></div>
      </header>

      <section className={styles.hero}>
        <div>
          <span>STEMI → olası VF → ROSC → DEVİR</span>
          <h1>Video değil, kararların değiştirdiği bir hasta.</h1>
          <p>Görüşme, muayene, tetkik, ilaç, müdahale ve ekip araçları aynı olay motoruna bağlıdır. Her karar zaman, maliyet, fizyoloji, seçenek ve rubrikte iz bırakır.</p>
        </div>
        <aside>
          <div><span>Simülasyon saati</span><strong>{formatTime(session.state.elapsedSeconds)}</strong></div>
          <div><span>Olay</span><strong>{session.records.length}</strong></div>
          <div><span>Maliyet</span><strong>{formatCurrency(session.state.financialCost)}</strong></div>
          <div><span>Seed</span><strong>{session.state.seed}</strong></div>
        </aside>
      </section>

      <section className={styles.modeBar} aria-label="Simülasyon çalışma modu">
        <div>
          {SIMULATION_MODES.map((mode) => <button type="button" key={mode} className={session.state.mode === mode ? styles.modeActive : ""} aria-pressed={session.state.mode === mode} onClick={() => reset(mode)}>{modeLabels[mode]}</button>)}
        </div>
        <nav aria-label="Öğrenci ve eğitici görünümü">
          <button type="button" className={workspaceView === "student" ? styles.viewActive : ""} onClick={() => setWorkspaceView("student")}>Öğrenci çalışma alanı</button>
          <button type="button" className={workspaceView === "analytics" ? styles.viewActive : ""} onClick={() => setWorkspaceView("analytics")}>Eğitici analitiği</button>
          <button type="button" onClick={() => reset()}>Oturumu sıfırla</button>
        </nav>
      </section>

      {workspaceView === "analytics" ? <Analytics session={session} /> : (
        <>
          <section className={styles.clinicalStage}>
            <PatientScene session={session} />
            <Monitor session={session} />
          </section>

          {showRealtimeExplanation ? (
            <section className={`${styles.liveFeedback} ${latest?.safetyAlert ? styles.liveFeedbackDanger : ""}`} aria-live="polite">
              <div><span>ANLIK EĞİTİCİ GERİ BİLDİRİMİ</span><strong>{latest?.publicFeedback ?? session.state.lastMessage}</strong></div>
              <p>{latest?.mechanism ?? session.state.lastMechanism}</p>
            </section>
          ) : <section className={styles.examNotice}><strong>{modeLabels[session.state.mode]} modu</strong><span>Açıklayıcı mekanizma ve ipuçları oturum tamamlanana kadar gizlidir.</span></section>}

          <section className={styles.toolNavigation} aria-label="Klinik araçlar">
            {(Object.keys(toolMeta) as ToolName[]).map((tool) => (
              <button type="button" key={tool} className={activeTool === tool ? styles.toolActive : ""} aria-pressed={activeTool === tool} onClick={() => setActiveTool(tool)}>
                <span>{toolMeta[tool].short}</span>
                <small>{TOOL_CATALOG[tool].length} eylem</small>
              </button>
            ))}
          </section>

          <section className={styles.workspaceGrid}>
            <ToolWorkspace session={session} activeTool={activeTool} onEvent={dispatch} />
            <aside className={styles.sideRail}>
              <section className={styles.clockActions}>
                <header><span>KLİNİK ZAMAN</span><strong>Beklemek de bir karardır</strong></header>
                <div><button type="button" disabled={session.state.status === "completed"} onClick={() => dispatch({ type: "ADVANCE_TIME", seconds: 60 })}>+1 dk</button><button type="button" disabled={session.state.status === "completed"} onClick={() => dispatch({ type: "ADVANCE_TIME", seconds: 300 })}>+5 dk</button><button type="button" disabled={session.state.status === "completed"} onClick={() => dispatch({ type: "ADVANCE_TIME", seconds: 600 })}>+10 dk</button></div>
              </section>
              {session.state.mode !== "osce" ? <PhysiologyPanel session={session} /> : null}
              <section className={styles.patientNotebook}>
                <header><span>HASTA DOSYASI</span><strong>{session.state.knowledge.length} bilgi açıldı</strong></header>
                <ul>
                  {session.state.knowledge.slice(-8).map((item) => <li key={item}>{item.replace(":", " · ")}</li>)}
                  {!session.state.knowledge.length ? <li>Henüz doğrulanmış klinik bilgi yok.</li> : null}
                </ul>
              </section>
            </aside>
          </section>

          <section className={styles.lowerGrid}>
            <ManimExplanation session={session} />
            <Timeline session={session} />
          </section>
          <EvidencePanel session={session} />
          {session.state.status === "completed" ? <Analytics session={session} /> : null}
        </>
      )}

      <footer className={styles.legalFooter}>
        Eğitim amaçlı sentetik prototip. Tanı/tedavi önerisi veya klinik karar desteği değildir. UÇEP aday eşlemeleri ve klinik motor çıktıları uzman/kurul onayı olmadan resmî uyum kanıtı sayılmaz. Gerçek hasta, öğrenci, biyometri, mikrofon, kamera veya canlı cihaz verisi kullanılmaz.
      </footer>
    </main>
  );
}
