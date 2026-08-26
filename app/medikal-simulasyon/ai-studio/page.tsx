"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import styles from "./studio.module.css";

type SessionState = "checking" | "disabled" | "locked" | "authenticated";
type JobState = {
  job_id: string;
  status: "queued" | "generating" | "validating" | "rendering" | "completed" | "failed";
  progress: number;
  current_step: string;
  engine_mode: string;
  error?: string | null;
};
type ResultState = {
  job_id: string;
  scenario_id: string;
  scenario_version: string;
  module_id: number;
  engine_mode: string;
  scene_class_name: string;
  video_url: string | null;
  duration_seconds: number;
  sha256: string;
  storyboard: Array<{ order: number; description: string; duration_seconds: number; narration?: string }>;
  validation: Record<string, unknown>;
  generated_at: string;
};
type ApiError = { detail?: string; status?: string };

const modules = [
  "Sanal Hasta", "Olguya Dayalı Öğrenme", "Klinik Akıl Yürütme", "Tanı ve Tetkik",
  "Tedavi ve Müdahale", "Acil Durum Simülasyonları", "Ekip Yönetimi & Klinik Liderlik",
  "Entegre Klinik Simülasyon",
];

const preset = {
  scenario_id: "scn_stemi_vf_rosc",
  scenario_version: "1.0.0",
  module_id: 6,
  learning_objective: "Şoklanabilir ritmi tanımak, yüksek kaliteli CPR başlatmak ve erken defibrilasyonun klinik sonucunu yeniden değerlendirmek.",
  patient_state_before: {
    phase: "vf", consciousness: "unresponsive", pain_score: 0, heart_rate: 0,
    systolic_bp: 0, diastolic_bp: 0, spo2: 72, respiratory_rate: 0,
    temperature_c: 36.7, rhythm: "vf",
    visible_signs: ["Yanıtsız", "Normal solunum yok", "VF monitör ritmi"],
    active_interventions: ["CPR"],
  },
  learner_action: {
    action_id: "safe-defibrillation",
    label: "CPR kesintisini en aza indirerek güvenli defibrilasyon uygula",
    category: "resuscitation",
    learner_justification: "Şoklanabilir ritim ve kardiyak arrest bulguları mevcut.",
    time_cost_seconds: 90,
  },
  patient_state_after: {
    phase: "rosc", consciousness: "verbal", pain_score: 0, heart_rate: 92,
    systolic_bp: 106, diastolic_bp: 68, spo2: 96, respiratory_rate: 18,
    temperature_c: 36.7, rhythm: "rosc",
    visible_signs: ["Organize ritim", "Palpe edilebilir nabız", "Spontan solunum"],
    active_interventions: ["Post-ROSC izlem", "Oksijenasyon", "12 derivasyon EKG"],
  },
  clinical_rationale: "Onaylanmış sentetik olay sözleşmesinde erken defibrilasyon sonrasında organize ritim ve dolaşım geri dönüşü tanımlanmıştır.",
  critical_signal: "VF ritminden organize ritme geçiş, nabız kontrolü ve post-ROSC yeniden değerlendirme",
  debrief_question: "Şok öncesi ve sonrası hangi ekip davranışı kompresyon kesintisini en çok etkiledi?",
  visual_focus: "monitor_transition",
  voiceover_language: "tr",
  duration_seconds: 32,
  safety_constraints: ["Yalnız sentetik hasta", "İlaç veya enerji dozu üretme", "Yerel protokol yerine geçme"],
  expert_approval_reference: "PILOT-EXPERT-APPROVAL-PENDING-001",
  source_references: [
    { source_id: "ERC Adult Advanced Life Support", source_version: "2025", locator: "educational reference" },
    { source_id: "TEYS scenario contract", source_version: "1.0.0", locator: "scn_stemi_vf_rosc" },
  ],
  rights_confirmed: true,
  synthetic_patient_confirmed: true,
  request_ai_generation: true,
};

async function json<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & ApiError;
  if (!response.ok) throw new Error(body.detail || `HTTP ${response.status}`);
  return body;
}

function statusLabel(status?: JobState["status"]): string {
  return ({
    queued: "Kuyrukta", generating: "AI sahnesi üretiliyor",
    validating: "arXivisual kalite kapıları", rendering: "Manim render",
    completed: "Hazır", failed: "Başarısız",
  }[status ?? "queued"] ?? "Bekleniyor");
}

export default function MedicalAiStudioPage() {
  const [session, setSession] = useState<SessionState>("checking");
  const [token, setToken] = useState("");
  const [moduleId, setModuleId] = useState(6);
  const [requestAi, setRequestAi] = useState(true);
  const [rights, setRights] = useState(true);
  const [synthetic, setSynthetic] = useState(true);
  const [approval, setApproval] = useState(preset.expert_approval_reference);
  const [job, setJob] = useState<JobState | null>(null);
  const [result, setResult] = useState<ResultState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/medical-simulation/access", { cache: "no-store" });
        const body = (await response.json()) as ApiError;
        if (body.status === "authenticated") setSession("authenticated");
        else if (body.status === "disabled") setSession("disabled");
        else setSession("locked");
      } catch { setSession("disabled"); }
    })();
  }, []);

  useEffect(() => {
    if (!job || !["queued", "generating", "validating", "rendering"].includes(job.status)) return;
    const timer = window.setTimeout(async () => {
      try {
        const next = await json<JobState>(await fetch(`/api/medical-simulation/jobs/${job.job_id}`, { cache: "no-store" }));
        setJob(next);
        if (next.status === "completed") {
          const final = await json<ResultState>(await fetch(`/api/medical-simulation/jobs/${job.job_id}/result`, { cache: "no-store" }));
          setResult(final); setSubmitting(false);
        } else if (next.status === "failed") {
          setMessage(next.error || "Üretim tamamlanamadı."); setSubmitting(false);
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "İş durumu alınamadı.");
        setSubmitting(false);
      }
    }, 3500);
    return () => window.clearTimeout(timer);
  }, [job]);

  async function signIn(event: FormEvent) {
    event.preventDefault(); setMessage(null);
    try {
      await json(await fetch("/api/medical-simulation/access", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }),
      }));
      setToken(""); setSession("authenticated");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Pilot erişimi doğrulanamadı."); }
  }

  async function createJob(event: FormEvent) {
    event.preventDefault(); setMessage(null); setResult(null); setSubmitting(true);
    const payload = { ...preset, module_id: moduleId, expert_approval_reference: approval,
      rights_confirmed: rights, synthetic_patient_confirmed: synthetic, request_ai_generation: requestAi };
    try {
      const created = await json<JobState>(await fetch("/api/medical-simulation/jobs", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
      }));
      setJob(created);
    } catch (error) {
      setSubmitting(false); setMessage(error instanceof Error ? error.message : "Üretim işi başlatılamadı.");
    }
  }

  const steps = useMemo(() => [
    ["01", "Olay sözleşmesi", job ? "tamamlandı" : "bekliyor"],
    ["02", requestAi ? "AI storyboard + Manim" : "Deterministik Manim", job?.status === "generating" ? "aktif" : job ? "tamamlandı" : "bekliyor"],
    ["03", "Kod / mekân / runtime QA", job?.status === "validating" ? "aktif" : job && ["rendering", "completed"].includes(job.status) ? "tamamlandı" : "bekliyor"],
    ["04", "İzole Manim render", job?.status === "rendering" ? "aktif" : job?.status === "completed" ? "tamamlandı" : "bekliyor"],
    ["05", "Video + hash + debrief", result ? "tamamlandı" : "bekliyor"],
  ], [job, requestAi, result]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <a href="/medikal-simulasyon" className={styles.brand}><span>TEYS</span><div><strong>arXivisual Klinik Studio</strong><small>MAMS · UÇTAN UCA SAHNE ÜRETİMİ</small></div></a>
        <nav><a href="/medikal-simulasyon">Simülasyona dön</a></nav>
      </header>
      <div className={styles.banner}><b>KONTROLLÜ PİLOT</b><span>Sentetik hasta · Uzman onaylı olay sözleşmesi · Klinik karar desteği değildir</span></div>
      <section className={styles.hero}>
        <div><span className={styles.kicker}>OLAY SÖZLEŞMESİ → ARXIVISUAL AI → MANIM → VIDEO → DEBRIEF</span><h1>Klinik kararın sonucunu gerçek Manim sahnesine dönüştür.</h1><p>TEYS, klinik kural üretmez. Uzman onaylı sentetik durum geçişini arXivisual’ın AI kod üretimi, doğrulama kapıları ve izole render motorundan geçirir.</p></div>
        <div className={styles.engineBadge}><i /><span>Motor</span><strong>{job?.engine_mode || "bağlantı bekleniyor"}</strong></div>
      </section>
      {session === "disabled" ? <section className={styles.notice}><strong>Motor geçidi henüz etkin değil.</strong><p>Container dağıtımı ve üç server-side secret tanımlandığında bu ekran gerçek üretim işlerini başlatır. Aşağıdaki tohum video, arXivisual’ın gerçek Manim render yoluyla üretilir.</p></section> : null}
      {session === "locked" ? <section className={styles.lockPanel}><div><span>YETKİ KAPISI</span><h2>Pilot çalışma alanını aç</h2><p>Servis anahtarı tarayıcıya verilmez. Pilot anahtarı doğrulanınca sekiz saatlik HttpOnly oturum açılır.</p></div><form onSubmit={signIn}><label htmlFor="pilot-token">Pilot erişim anahtarı</label><input id="pilot-token" type="password" value={token} onChange={(e) => setToken(e.target.value)} minLength={32} required /><button>Oturumu aç</button></form></section> : null}
      {session === "authenticated" ? <section className={styles.workspace}>
        <form className={styles.form} onSubmit={createJob}>
          <div className={styles.sectionTitle}><span>01 · GİRDİ</span><h2>Onaylı klinik olay</h2></div>
          <label>Modül<select value={moduleId} onChange={(e) => setModuleId(Number(e.target.value))}>{modules.map((title, index) => <option key={title} value={index + 1}>{String(index + 1).padStart(2, "0")} — {title}</option>)}</select></label>
          <label>Uzman onay referansı<input value={approval} onChange={(e) => setApproval(e.target.value)} minLength={6} required /></label>
          <div className={styles.stateCompare}><article><span>ÖNCE</span><strong>VF arrest</strong><p>HR 0 · TA 0/0 · SpO₂ 72 · SS 0</p></article><i>→</i><article><span>SONRA</span><strong>ROSC</strong><p>HR 92 · TA 106/68 · SpO₂ 96 · SS 18</p></article></div>
          <label className={styles.check}><input type="checkbox" checked={requestAi} onChange={(e) => setRequestAi(e.target.checked)} /><span><strong>arXivisual AI üretimini kullan</strong><small>Provider yoksa güvenli şablon fallback’i çalışır.</small></span></label>
          <label className={styles.check}><input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} /><span><strong>Kaynak ve türev kullanım hakkı doğrulandı</strong></span></label>
          <label className={styles.check}><input type="checkbox" checked={synthetic} onChange={(e) => setSynthetic(e.target.checked)} /><span><strong>Hasta tamamen sentetiktir</strong></span></label>
          <button className={styles.primary} disabled={submitting || !rights || !synthetic}>{submitting ? "Üretim sürüyor…" : "arXivisual sahnesini üret"}</button>
        </form>
        <div className={styles.pipeline}><div className={styles.sectionTitle}><span>02 · PIPELINE</span><h2>Canlı üretim zinciri</h2></div><div className={styles.progress}><span style={{ width: `${job?.progress ?? 0}%` }} /></div><div className={styles.progressMeta}><strong>{job ? statusLabel(job.status) : "İş bekleniyor"}</strong><b>{job?.progress ?? 0}%</b></div><div className={styles.steps}>{steps.map(([number, label, state]) => <article key={number} data-state={state}><b>{number}</b><div><strong>{label}</strong><small>{state}</small></div></article>)}</div>{message ? <div className={styles.error}>{message}</div> : null}</div>
      </section> : null}
      <section className={styles.output}><div className={styles.outputHead}><div><span>03 · ÇIKTI</span><h2>arXivisual klinik sahne</h2></div>{result ? <div className={styles.hash}><small>SHA-256</small><code>{result.sha256.slice(0, 20)}…</code></div> : null}</div><div className={styles.videoShell}><video controls preload="metadata" src={result?.video_url || "/medical-simulation/manim/med_seed_vf_rosc.mp4"}>Tarayıcınız video oynatmayı desteklemiyor.</video><div className={styles.videoMeta}><span>{result ? "Canlı iş sonucu" : "arXivisual tohum render"}</span><strong>{result?.engine_mode || "arxivisual-template · Manim"}</strong></div></div><div className={styles.storyboard}>{(result?.storyboard || [
        { order: 1, description: "Sentetik hasta ve VF karar noktası", duration_seconds: 5 },
        { order: 2, description: "Güvenli defibrilasyon eylemi", duration_seconds: 6 },
        { order: 3, description: "VF → ROSC vital geçişi", duration_seconds: 8 },
        { order: 4, description: "Kritik sinyal ve yeniden değerlendirme", duration_seconds: 6 },
        { order: 5, description: "Yansıtıcı debriefing sorusu", duration_seconds: 5 },
      ]).map((beat) => <article key={beat.order}><b>{String(beat.order).padStart(2, "0")}</b><div><strong>{beat.description}</strong><small>{beat.duration_seconds} sn</small></div></article>)}</div></section>
      <footer className={styles.footer}><span>TEYS / MAMS · Gürsel Online Eğitim ve Bilgi Teknolojileri A.Ş.</span><strong>Production: NO-GO</strong></footer>
    </main>
  );
}
