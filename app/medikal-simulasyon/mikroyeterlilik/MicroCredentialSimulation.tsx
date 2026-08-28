"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import {
  DIFFERENTIAL_OPTIONS,
  TOOL_CATALOG,
  createSession,
  dispatchEvent,
  getAvailableActions,
  restoreSession,
  type ClinicalEvent,
  type ClinicalSession,
  type ToolName,
} from "../../../services/medical-simulation-v2/engine.js";
import {
  MICRO_CREDENTIAL_PROGRAM,
  MICRO_CREDENTIAL_SOURCES,
  MICRO_CREDENTIAL_STORAGE_KEY,
  MICRO_CREDENTIAL_VERSION,
  STANDARD_ELEMENTS,
  buildEvidencePackage,
  evaluateAssessment,
  evaluatePractice,
} from "../../../services/medical-microcredential/program.js";
import BedsideMonitor from "../v2/BedsideMonitor";
import ClinicalDiagnosticViewer from "../v2/ClinicalDiagnosticViewer";
import type { ExamRegion } from "../v2/PatientRoom3D";
import styles from "./microcredential.module.css";

const PatientRoom3D = dynamic(() => import("../v2/PatientRoom3D"), {
  ssr: false,
  loading: () => <div className={styles.sceneLoading}>Sentetik hasta hazırlanıyor…</div>,
});

type Stage = "program" | "learning" | "assessment" | "evidence";
type Profile = { learnerName: string; prerequisiteAccepted: boolean; scopeAccepted: boolean };
type ReasoningDraft = { problemRepresentation: string; differentials: string[]; workingDiagnosis: string; reassessmentPlan: string };

const EMPTY_REASONING: ReasoningDraft = { problemRepresentation: "", differentials: [], workingDiagnosis: "", reassessmentPlan: "" };
const STAGES: Array<{ id: Stage; label: string }> = [
  { id: "program", label: "Program" },
  { id: "learning", label: "Öğrenme" },
  { id: "assessment", label: "Değerlendirme" },
  { id: "evidence", label: "Kanıt" },
];
const TOOL_LABELS: Record<ToolName, string> = {
  interview: "Hasta görüşmesi",
  exam: "Muayene",
  test: "Tetkikler",
  medication: "İlaçlar",
  intervention: "Müdahaleler",
  team: "Ekip",
  reasoning: "Klinik gerekçe",
};
const PHASE_LABELS: Record<string, string> = {
  assessment: "İlk değerlendirme",
  stemi: "Tanısal karar",
  treatment: "Tedavi ve transfer",
  vf: "Arrest yönetimi",
  rosc: "Dolaşım sonrası bakım",
  handoff: "Klinik devir",
};

function eventForAction(tool: ToolName, actionId: string): ClinicalEvent {
  if (tool === "interview") return { type: "ASK_PATIENT", topic: actionId };
  if (tool === "exam") return { type: "PERFORM_EXAM", actionId };
  if (tool === "test") return { type: "ORDER_TEST", actionId };
  if (tool === "medication") return { type: "ADMINISTER_MEDICATION", actionId };
  if (tool === "intervention") return { type: "PERFORM_INTERVENTION", actionId };
  if (tool === "team") return { type: "TEAM_ACTION", actionId };
  throw new Error("Klinik gerekçe form üzerinden kaydedilmelidir.");
}

function formatClock(seconds: number) {
  const safe = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function createPracticeSession() {
  return createSession({ mode: "training", seed: 27082026, encounterId: "enc_classic_stemi", difficulty: "guided" });
}

function createAssessmentSession() {
  return createSession({ mode: "assessment", seed: 28082026, encounterId: "enc_classic_stemi", difficulty: "standard" });
}

function GateList({ items }: { items: Array<{ id: string; label: string; passed: boolean }> }) {
  return <ul className={styles.gateList}>{items.map((item) => (
    <li key={item.id} data-passed={item.passed}><span>{item.passed ? "✓" : "○"}</span>{item.label}</li>
  ))}</ul>;
}

function downloadJson(value: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function MicroCredentialSimulation() {
  const [stage, setStage] = useState<Stage>("program");
  const [profile, setProfile] = useState<Profile>({ learnerName: "", prerequisiteAccepted: false, scopeAccepted: false });
  const [practiceSession, setPracticeSession] = useState<ClinicalSession>(createPracticeSession);
  const [assessmentSession, setAssessmentSession] = useState<ClinicalSession>(createAssessmentSession);
  const [practiceCompleted, setPracticeCompleted] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolName>("interview");
  const [examRegion, setExamRegion] = useState<ExamRegion>("head");
  const [question, setQuestion] = useState("");
  const [reasoningDraft, setReasoningDraft] = useState<ReasoningDraft>(EMPTY_REASONING);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(MICRO_CREDENTIAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.version === MICRO_CREDENTIAL_VERSION) {
          setStage(STAGES.some((item) => item.id === parsed.stage) ? parsed.stage : "program");
          setProfile({ learnerName: String(parsed.profile?.learnerName ?? ""), prerequisiteAccepted: Boolean(parsed.profile?.prerequisiteAccepted), scopeAccepted: Boolean(parsed.profile?.scopeAccepted) });
          setPracticeCompleted(Boolean(parsed.practiceCompleted));
          setPracticeSession(restoreSession(parsed.practiceSession));
          setAssessmentSession(restoreSession(parsed.assessmentSession));
        }
      }
    } catch {
      localStorage.removeItem(MICRO_CREDENTIAL_STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(MICRO_CREDENTIAL_STORAGE_KEY, JSON.stringify({ version: MICRO_CREDENTIAL_VERSION, stage, profile, practiceCompleted, practiceSession, assessmentSession }));
  }, [assessmentSession, hydrated, practiceCompleted, practiceSession, profile, stage]);

  const isAssessment = stage === "assessment" || stage === "evidence";
  const session = isAssessment ? assessmentSession : practiceSession;
  const setSession = isAssessment ? setAssessmentSession : setPracticeSession;
  const state = session.state;
  const actions = useMemo(() => getAvailableActions(state, activeTool), [activeTool, state]);
  const practice = useMemo(() => evaluatePractice(practiceSession), [practiceSession]);
  const result = useMemo(() => evaluateAssessment(assessmentSession, {
    learnerName: profile.learnerName,
    orientationAccepted: profile.prerequisiteAccepted && profile.scopeAccepted,
    practiceCompleted,
  }), [assessmentSession, practiceCompleted, profile]);
  const programReady = Boolean(profile.learnerName.trim() && profile.prerequisiteAccepted && profile.scopeAccepted);

  function apply(event: ClinicalEvent) {
    setSession((current) => dispatchEvent(current, event));
  }

  function submitQuestion() {
    if (!question.trim()) return;
    apply({ type: "ASK_PATIENT", question: question.trim() });
    setQuestion("");
  }

  function submitReasoning() {
    if (!reasoningDraft.problemRepresentation.trim() || reasoningDraft.differentials.length < 2 || !reasoningDraft.workingDiagnosis || !reasoningDraft.reassessmentPlan.trim()) return;
    apply({ type: "DOCUMENT_REASONING", ...reasoningDraft });
    setReasoningDraft(EMPTY_REASONING);
  }

  function startLearning() {
    if (!programReady) return;
    setStage("learning");
    setActiveTool("interview");
  }

  function finishPractice() {
    if (!practice.passed) return;
    setPracticeCompleted(true);
    setAssessmentSession(createAssessmentSession());
    setStage("assessment");
    setActiveTool("interview");
    setExamRegion("head");
  }

  function resetPathway() {
    localStorage.removeItem(MICRO_CREDENTIAL_STORAGE_KEY);
    setStage("program");
    setProfile({ learnerName: "", prerequisiteAccepted: false, scopeAccepted: false });
    setPracticeSession(createPracticeSession());
    setAssessmentSession(createAssessmentSession());
    setPracticeCompleted(false);
    setActiveTool("interview");
    setExamRegion("head");
    setQuestion("");
    setReasoningDraft(EMPTY_REASONING);
  }

  function downloadEvidence() {
    const evidence = buildEvidencePackage({ learnerName: profile.learnerName, assessmentSession, orientationAccepted: profile.prerequisiteAccepted && profile.scopeAccepted, practiceCompleted });
    downloadJson(evidence, `teys-mams-mikroyeterlilik-kanit-${assessmentSession.stateHash}.json`);
  }

  const canOpenStage = (target: Stage) => target === "program"
    || target === "learning" && programReady
    || target === "assessment" && practiceCompleted
    || target === "evidence" && assessmentSession.state.status === "completed";

  return <main className={styles.shell}>
    <header className={styles.topbar}>
      <div><span>TEYS / MAMS</span><strong>Mikro-Yeterlilik Pilot Sürümü</strong></div>
      <div className={styles.status}><i />{MICRO_CREDENTIAL_PROGRAM.credentialStatus}</div>
      <button type="button" data-action-contract="Mikro-yeterlilik yolculuğunu ve yerel kayıtları sıfırlar" onClick={resetPathway}>Baştan başla</button>
    </header>

    <section className={styles.hero}>
      <div>
        <span>25 SAATLİK ADAY ÖĞRENME BİRİMİ</span>
        <h1>{MICRO_CREDENTIAL_PROGRAM.title}</h1>
        <p>Hazırlık, gerçek zamanlı sentetik hasta uygulaması, performans değerlendirmesi ve taşınabilir kanıt paketi tek akışta.</p>
      </div>
      <dl>
        <div><dt>Hedef grup</dt><dd>Dönem 4–6</dd></div>
        <div><dt>Önerilen kredi</dt><dd>1 · onay bekliyor</dd></div>
        <div><dt>TYÇ / AYÇ seviyesi</dt><dd>DOĞRULANMADI</dd></div>
      </dl>
    </section>

    <nav className={styles.pathway} aria-label="Mikro-yeterlilik aşamaları">
      {STAGES.map((item, index) => <button
        type="button"
        key={item.id}
        data-action-contract={`${item.label} aşamasını açar`}
        aria-current={stage === item.id ? "step" : undefined}
        disabled={!canOpenStage(item.id) || stage === item.id}
        onClick={() => setStage(item.id)}
      ><span>{String(index + 1).padStart(2, "0")}</span>{item.label}</button>)}
    </nav>

    {stage === "program" ? <section className={styles.programGrid}>
      <article className={styles.card}>
        <div className={styles.cardHead}><span>PROGRAM KAYDI</span><b>ADAY</b></div>
        <h2>Ölçülebilir öğrenme çıktıları</h2>
        <ol className={styles.outcomeList}>{MICRO_CREDENTIAL_PROGRAM.learningOutcomes.map((outcome, index) => <li key={outcome}><span>{index + 1}</span>{outcome}</li>)}</ol>
      </article>
      <article className={styles.card}>
        <div className={styles.cardHead}><span>İŞ YÜKÜ</span><b>25 SAAT</b></div>
        <h2>Öğrenme planı</h2>
        <div className={styles.workload}>
          {[['Hazırlık ve ön öğrenme', 4], ['Rehberli klinik uygulama', 8], ['Bireysel çalışma', 5], ['Performans değerlendirmesi', 2], ['Yansıtma ve kanıt dosyası', 6]].map(([label, hours]) => <div key={String(label)}><span>{label}</span><b>{hours} sa.</b><i style={{ width: `${Number(hours) * 4}%` }} /></div>)}
        </div>
        <small>1 kredi önerisi, 25 saatlik tahminî iş yüküne dayanır; kurum kararı olmadan AKTS veya resmî kredi değildir.</small>
      </article>
      <article className={styles.card}>
        <div className={styles.cardHead}><span>KAYIT</span><b>YEREL PİLOT</b></div>
        <h2>Öğrenen bilgisi ve kapsam</h2>
        <label className={styles.field}><span>Ad ve soyad</span><input aria-label="Öğrenenin adı ve soyadı" value={profile.learnerName} onChange={(event) => setProfile((current) => ({ ...current, learnerName: event.target.value }))} placeholder="Adınızı ve soyadınızı yazın" /></label>
        <label className={styles.check}><input type="checkbox" checked={profile.prerequisiteAccepted} onChange={(event) => setProfile((current) => ({ ...current, prerequisiteAccepted: event.target.checked }))} /><span>Ön koşulu karşıladığımı veya kurumumun eşdeğer kabulünü aldığımı beyan ediyorum.</span></label>
        <label className={styles.check}><input type="checkbox" checked={profile.scopeAccepted} onChange={(event) => setProfile((current) => ({ ...current, scopeAccepted: event.target.checked }))} /><span>Bunun sentetik eğitim pilotu olduğunu ve klinik karar desteği olmadığını anladım.</span></label>
        <button className={styles.primary} type="button" data-action-contract="Öğrenen kaydını saklar ve öğrenme aşamasını açar" disabled={!programReady} onClick={startLearning}>Öğrenmeye başla</button>
      </article>
      <article className={styles.card}>
        <div className={styles.cardHead}><span>ŞEFFAFLIK</span><b>11 ZORUNLU ALAN</b></div>
        <h2>Mikro-yeterlilik bilgi alanları</h2>
        <ul className={styles.standardList}>{STANDARD_ELEMENTS.map((item) => <li key={item}><span>✓</span>{item}</li>)}</ul>
        <p className={styles.warning}>Düzenleyen kuruluş, seviye, kimlik doğrulama ve dış kalite güvencesi henüz doğrulanmadığı için bu sürüm resmî belge düzenlemez.</p>
      </article>
    </section> : null}

    {(stage === "learning" || stage === "assessment") ? <>
      <section className={styles.modeBanner} data-mode={stage}>
        <div><span>{stage === "learning" ? "REHBERLİ ÖĞRENME" : "YETERLİLİK DEĞERLENDİRMESİ"}</span><h2>{stage === "learning" ? "Önce becerileri kanıtlayın" : "Yeni ve bağımsız olguyu tamamlayın"}</h2></div>
        <p>{stage === "learning" ? "Karar sonrası hasta yanıtı ve gerekçe görünür. Beş öğrenme kapısı tamamlandığında değerlendirme açılır." : "Anlık öğretici gerekçe kapalıdır. Kararlar, süre, güvenlik olayları ve hasta yanıtları sonuç dosyasına kaydedilir."}</p>
        <div className={styles.timer}><span>{PHASE_LABELS[state.phase]}</span><b>{formatClock(state.elapsedSeconds)}</b></div>
      </section>

      <section className={styles.simulationGrid}>
        <div className={styles.patientColumn}>
          <div className={styles.patientFrame}>
            <div className={styles.patientBadge}><span>SENTETİK HASTA</span><strong>{state.patient.age} yaş · {state.patient.sex}</strong><small>{state.patient.chiefComplaint}</small></div>
            <PatientRoom3D state={state} selectedRegion={examRegion} examModeActive={activeTool === "exam"} onRegionSelect={(region) => { setExamRegion(region); setActiveTool("exam"); }} />
            <div className={styles.monitorFrame}><BedsideMonitor state={state} /></div>
          </div>
          <section className={styles.feedback} data-alert={Boolean(session.records.at(-1)?.safetyAlert)} aria-live="polite">
            <span>SON HASTA YANITI</span>
            <strong>{stage === "learning" ? state.lastMessage : session.records.length ? "Karar kaydedildi; sentetik hasta durumu yeniden hesaplandı." : "İlk klinik kararınızı verin."}</strong>
            {stage === "learning" && session.records.length ? <p>{state.lastMechanism}</p> : null}
          </section>
          {stage === "learning" ? <section className={styles.practiceGate}>
            <div><span>ÖĞRENME KANITLARI</span><strong>{practice.gates.filter((gate) => gate.passed).length}/{practice.gates.length} tamamlandı</strong></div>
            <GateList items={practice.gates} />
            <button type="button" data-action-contract="Öğrenme kanıtlarını kilitler ve yeni değerlendirme olgusunu başlatır" disabled={!practice.passed} onClick={finishPractice}>Öğrenmeyi tamamla ve değerlendirmeyi başlat</button>
          </section> : null}
          {stage === "assessment" && state.status === "completed" ? <section className={styles.completionCallout}>
            <div><span>DEĞERLENDİRME TAMAMLANDI</span><strong>{result.learningAchievementMet ? "Öğrenme başarısı kanıtlandı" : "Bazı yeterlilik kapıları karşılanmadı"}</strong></div>
            <button type="button" data-action-contract="Değerlendirme sonucunu ve belge düzenleme kapılarını açar" onClick={() => setStage("evidence")}>Sonucu ve kanıtları incele</button>
          </section> : null}
        </div>

        <aside className={styles.toolDock} aria-label="Klinik araçlar">
          <div className={styles.toolTabs} role="tablist" aria-label="Klinik araç grupları">
            {(Object.keys(TOOL_LABELS) as ToolName[]).map((tool, index) => <button type="button" role="tab" key={tool} data-action-contract={`${TOOL_LABELS[tool]} aracını açar`} aria-selected={activeTool === tool} disabled={activeTool === tool} onClick={() => setActiveTool(tool)}><span>{String(index + 1).padStart(2, "0")}</span>{TOOL_LABELS[tool]}</button>)}
          </div>
          <div className={styles.toolPanel} role="tabpanel">
            <div className={styles.toolHead}><div><span>AKTİF ARAÇ</span><h2>{TOOL_LABELS[activeTool]}</h2></div><b>{activeTool === "reasoning" ? `${state.reasoning.length} kayıt` : `${actions.filter((item) => item.available).length}/${actions.length} açık`}</b></div>

            {activeTool === "interview" ? <form className={styles.questionForm} onSubmit={(event) => { event.preventDefault(); submitQuestion(); }}><label htmlFor="mc-patient-question">Hastaya kendi sorunuzu sorun</label><div><input id="mc-patient-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Örn. Ağrınız ne zaman başladı?" /><button type="submit" data-action-contract="Yazılan soruyu sentetik hastaya yöneltir ve yanıtı kaydeder" disabled={!question.trim()}>Sor</button></div></form> : null}

            {activeTool === "exam" ? <div className={styles.regionPicker} aria-label="Muayene bölgesi">{([['head', 'Baş / genel durum'], ['chest', 'Göğüs'], ['arm', 'Periferik dolaşım']] as Array<[ExamRegion, string]>).map(([region, label]) => <button type="button" key={region} data-testid={`mc-exam-region-${region}`} data-action-contract={`${label} muayene bölgesini seçer`} aria-pressed={examRegion === region} disabled={examRegion === region} onClick={() => setExamRegion(region)}>{label}</button>)}</div> : null}
            {activeTool === "test" ? <ClinicalDiagnosticViewer state={state} /> : null}

            {activeTool === "reasoning" ? <form className={styles.reasoningForm} onSubmit={(event) => { event.preventDefault(); submitReasoning(); }}>
              <label><span>Problem temsili</span><textarea aria-label="Problem temsili" value={reasoningDraft.problemRepresentation} onChange={(event) => setReasoningDraft((current) => ({ ...current, problemRepresentation: event.target.value }))} placeholder="Kritik bulguları tek cümlede sentezleyin" /></label>
              <fieldset><legend>Ayırıcı tanılar · en az iki</legend>{DIFFERENTIAL_OPTIONS.map((option) => <label key={option.id}><input type="checkbox" checked={reasoningDraft.differentials.includes(option.id)} onChange={(event) => setReasoningDraft((current) => ({ ...current, differentials: event.target.checked ? [...current.differentials, option.id] : current.differentials.filter((item) => item !== option.id) }))} />{option.label}</label>)}</fieldset>
              <label><span>Çalışma tanısı</span><select aria-label="Çalışma tanısı" value={reasoningDraft.workingDiagnosis} onChange={(event) => setReasoningDraft((current) => ({ ...current, workingDiagnosis: event.target.value }))}><option value="">Seçin</option>{DIFFERENTIAL_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
              <label><span>Yeniden değerlendirme planı</span><textarea aria-label="Yeniden değerlendirme planı" value={reasoningDraft.reassessmentPlan} onChange={(event) => setReasoningDraft((current) => ({ ...current, reassessmentPlan: event.target.value }))} placeholder="Neyi, ne zaman yeniden değerlendireceksiniz?" /></label>
              <button type="submit" data-action-contract="Klinik gerekçeyi zaman damgalı değerlendirme kanıtı olarak kaydeder" disabled={!reasoningDraft.problemRepresentation.trim() || reasoningDraft.differentials.length < 2 || !reasoningDraft.workingDiagnosis || !reasoningDraft.reassessmentPlan.trim() || state.status === "completed"}>Klinik gerekçeyi kaydet</button>
            </form> : null}

            {activeTool !== "reasoning" ? <div className={styles.actionList}>{actions.filter((action) => activeTool !== "exam" || action.region === examRegion).map((action) => <button type="button" key={action.id} data-action-contract={`${action.label} klinik eylemini uygular ve hasta durumunu günceller`} disabled={!action.available} title={action.reason || action.label} onClick={() => apply(eventForAction(activeTool, action.id))}><span>{action.available ? "UYGULA" : "KİLİTLİ"}</span><strong>{action.label}</strong><small>{formatClock(action.timeCostSeconds)}{action.cost ? ` · ₺${action.cost}` : ""}</small>{!action.available ? <em>{action.reason}</em> : null}</button>)}</div> : null}

            <div className={styles.observation} aria-live="polite"><span>ARAÇ ÇIKTISI</span>
              {activeTool === "interview" ? state.interview.slice(-2).map((item, index) => <p key={`${item.question}-${index}`}><b>{item.question}</b>{item.response}</p>) : null}
              {activeTool === "exam" ? state.examinations.filter((item) => item.region === examRegion).slice(-2).map((item, index) => <p key={`${item.id}-${index}`}><b>{item.technique}</b>{item.finding}</p>) : null}
              {activeTool === "test" ? state.orders.slice(-3).map((item) => <p key={item.id}><b>{item.label} · {item.status === "ready" ? "HAZIR" : "BEKLENİYOR"}</b>{item.result ?? "Sonuç için klinik zamanı ilerletin."}</p>) : null}
              {activeTool === "medication" ? state.medications.slice(-3).map((item) => <p key={item.id}><b>{TOOL_CATALOG.medication.find((action) => action.id === item.id)?.label}</b>{item.contraindicated ? "Güvenlik olayı kaydedildi." : "Uygulama kararı kaydedildi."}</p>) : null}
              {activeTool === "intervention" ? state.interventions.slice(-4).map((id) => <p key={id}><b>TAMAMLANDI</b>{TOOL_CATALOG.intervention.find((action) => action.id === id)?.label}</p>) : null}
              {activeTool === "team" ? state.teamActions.slice(-4).map((id) => <p key={id}><b>KAYDEDİLDİ</b>{TOOL_CATALOG.team.find((action) => action.id === id)?.label}</p>) : null}
              {activeTool === "reasoning" ? state.reasoning.slice(-2).map((item) => <p key={item.id}><b>{formatClock(item.atSeconds)} · {DIFFERENTIAL_OPTIONS.find((option) => option.id === item.workingDiagnosis)?.label}</b>{item.problemRepresentation}</p>) : null}
            </div>
            <div className={styles.timeControls}><span>Klinik zamanı ilerlet</span>{[60, 180, 300].map((seconds) => <button type="button" key={seconds} data-action-contract={`Klinik zamanı ${seconds / 60} dakika ilerletir ve hasta durumunu yeniden hesaplar`} disabled={state.status === "completed"} onClick={() => apply({ type: "ADVANCE_TIME", seconds })}>+{seconds / 60} dk</button>)}</div>
          </div>
        </aside>
      </section>
    </> : null}

    {stage === "evidence" ? <section className={styles.evidenceGrid}>
      <article className={styles.resultCard} data-passed={result.learningAchievementMet}>
        <span>ÖĞRENME SONUCU</span>
        <h2>{result.learningAchievementMet ? "Başarı kanıtlandı" : "Henüz karşılanmadı"}</h2>
        <p>{result.learningAchievementMet ? "Performans ve hasta güvenliği kapıları karşılandı. Sonuç, resmî belge düzenleme kapılarından ayrıdır." : "Eksik performans kapıları nedeniyle öğrenme başarısı kaydı oluşmadı."}</p>
        <strong>{profile.learnerName}</strong>
        <small>Oturum: {formatClock(assessmentSession.state.elapsedSeconds)} · {assessmentSession.records.length} karar</small>
      </article>
      <article className={styles.card}><div className={styles.cardHead}><span>PERFORMANS KAPILARI</span><b>{result.achievementGates.filter((gate) => gate.passed).length}/{result.achievementGates.length}</b></div><GateList items={result.achievementGates} /></article>
      <article className={styles.card}><div className={styles.cardHead}><span>RESMÎ DÜZENLEME KAPILARI</span><b>DOĞRULANMADI</b></div><GateList items={result.issuanceGates} /><p className={styles.warning}>Bu kapılar, tarayıcı içindeki öğrenci işlemleriyle açılamaz; yetkili kurum, kimlik doğrulama, kurul kararı ve kalite güvencesi gerekir.</p></article>
      <article className={styles.card}><div className={styles.cardHead}><span>YETERLİLİK BOYUTLARI</span><b>PUAN</b></div><div className={styles.scoreGrid}>{Object.entries(result.debrief.dimensions).map(([key, value]) => <div key={key}><span>{key === "informationGathering" ? "Bilgi toplama" : key === "clinicalReasoning" ? "Klinik akıl yürütme" : key === "treatment" ? "Tedavi" : key === "patientSafety" ? "Hasta güvenliği" : key === "teamwork" ? "Ekip çalışması" : "Zaman yönetimi"}</span><strong>{value}</strong><i style={{ width: `${value}%` }} /></div>)}</div></article>
      <article className={styles.card}><div className={styles.cardHead}><span>TAŞINABİLİR KANIT</span><b>JSON</b></div><h2>Kanıt paketini indirin</h2><p>Program alanları, değerlendirme kontrol listesi, karar sayısı, puanlar, kaynaklar ve bütünlük kaydı tek dosyada tutulur.</p><button className={styles.primary} type="button" data-action-contract="Mikro-yeterlilik standart alanlarını ve değerlendirme kanıtını JSON dosyası olarak indirir" onClick={downloadEvidence}>Kanıt paketini indir</button><small>Dosya bir sertifika değildir; yetkili kurumun doğrulama ve belgelendirme sürecine girdi sağlar.</small></article>
      <article className={styles.card}><div className={styles.cardHead}><span>PROGRAM KİMLİĞİ</span><b>PİLOT</b></div><dl className={styles.identityList}><div><dt>Başlık</dt><dd>{MICRO_CREDENTIAL_PROGRAM.title}</dd></div><div><dt>Düzenleyen</dt><dd>{MICRO_CREDENTIAL_PROGRAM.issuer}</dd></div><div><dt>İş yükü</dt><dd>{MICRO_CREDENTIAL_PROGRAM.notionalWorkloadHours} saat</dd></div><div><dt>Seviye</dt><dd>{MICRO_CREDENTIAL_PROGRAM.levelStatus}</dd></div><div><dt>Ölçme</dt><dd>{MICRO_CREDENTIAL_PROGRAM.assessmentType}</dd></div><div><dt>Katılım</dt><dd>{MICRO_CREDENTIAL_PROGRAM.participationForm}</dd></div></dl></article>
    </section> : null}

    <section className={styles.sources}>
      <div><span>DAYANAKLAR</span><h2>Resmî kaynaklar ve açık onay durumu</h2></div>
      <div>{MICRO_CREDENTIAL_SOURCES.map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer"><span>{source.publisher}</span><strong>{source.label}</strong><small>{source.status} ↗</small></a>)}</div>
    </section>
    <footer className={styles.footer}><span>TEYS/MAMS · sentetik hasta · mikro-yeterlilik pilotu</span><b>Genel kullanıma açık değil · Resmî belge düzenlemez · Uzman ve kurum onayı bekliyor</b><a href="/medikal-simulasyon/v2">Korunan V2 sürümünü aç</a></footer>
  </main>;
}
