"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./engine-console.module.css";

type JsonRecord = Record<string, unknown>;

type EngineState = {
  connected?: boolean;
  status?: string;
  message?: string;
  capabilities?: JsonRecord;
  checks?: JsonRecord;
};

type SceneJob = {
  job_id: string;
  status: string;
  progress: number;
  error?: string | null;
  artifact?: {
    scene_class_name: string;
    video_url?: string | null;
    validation: {
      syntax_valid: boolean;
      spatial_valid: boolean;
      voiceover_valid: boolean;
      security_valid: boolean;
      issues: string[];
    };
  } | null;
};

const fallbackSample = {
  scenario_id: "TEYS-ACS-VF-001",
  scenario_version: "pilot-1.0",
  module_id: 6,
  scene_title: "STEMI sonrası ventriküler fibrilasyon ve ekip yanıtı",
  learning_objective:
    "Öğrenci klinik kötüleşmeyi erken fark eder, şoklanabilir ritmi tanır ve ekip görevlerini kapalı döngü iletişimle dağıtır.",
  synthetic_patient: true,
  synthetic_patient_id: "SYN-ACS-VF-001",
  patient_state_before: {
    heart_rate: 118,
    systolic_bp: 86,
    diastolic_bp: 54,
    spo2: 91,
    respiratory_rate: 26,
    temperature_c: 36.7,
    rhythm: "stemi",
    consciousness: "Kaygılı, sorulara uygun yanıt veriyor",
    pain_score: 8,
    breathing_pattern: "Yüzeyel ve hızlı solunum",
    clinical_description:
      "Sentetik hasta soğuk terli, göğüs ağrılı ve hemodinamik olarak instabil görünür.",
  },
  learner_action: {
    action_id: "team-defib-closed-loop",
    category: "team_command",
    label:
      "Defibrilatörü hazırlat, kompresyonu başlat ve ritim kontrolünü kapalı döngüyle yönet",
    rationale:
      "Şoklanabilir ritimde kesintisiz yüksek kaliteli CPR ve erken defibrilasyon senaryo hedefidir.",
    timing_seconds: 24,
    parameters: { closed_loop: true, sbar_handoff: true },
  },
  patient_state_after: {
    heart_rate: 0,
    systolic_bp: 0,
    diastolic_bp: 0,
    spo2: 78,
    respiratory_rate: 0,
    temperature_c: 36.7,
    rhythm: "ventricular_fibrillation",
    consciousness: "Yanıtsız",
    pain_score: 0,
    breathing_pattern: "Normal solunum yok",
    clinical_description:
      "Sentetik senaryoda hasta ventriküler fibrilasyon arrestine ilerler.",
  },
  clinical_rationale:
    "Bu geçiş yalnızca uzman onaylı sentetik senaryo akışını görselleştirir; gecikme, monitör ve ekip yanıtı arasındaki eğitimsel ilişkiyi gösterir.",
  visual_focus: "team_coordination",
  voiceover_language: "tr",
  duration_seconds: 38,
  safety_constraints: [
    "Gerçek hasta verisi veya gerçek kişi benzerliği kullanma",
    "Onaylı girdinin dışında doz, enerji veya klinik protokol ayrıntısı üretme",
    "Çıktıyı klinik karar desteği olarak sunma",
  ],
  source_references: [
    {
      source_id: "UCE-LOCAL-MAP-001",
      title: "Kurumsal UÇEP eşleştirme ve resüsitasyon senaryo kurulu kaydı",
      version: "pilot-2026",
      url: null,
      approved_for_scenario: true,
      approval_note: "Yerel eğitim kurulu doğrulaması gerektiren pilot kaynak kaydı",
    },
  ],
  expert_approval_reference: "TEYS-KLINIK-KURUL-PILOT-001",
  ucep_alignment_codes: ["UÇEP-2020-kurumsal-esleme-bekliyor"],
  horizontal_integration_tags: ["kardiyoloji", "acil-tıp", "farmakoloji", "iletişim"],
  vertical_integration_tags: ["temel-fizyoloji", "klinik-yorum", "acil-uygulama"],
  request_render: false,
};

export default function MedicalSimulationEngineConsole() {
  const [engine, setEngine] = useState<EngineState | null>(null);
  const [job, setJob] = useState<SceneJob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveMode = useMemo(() => {
    const capabilities = engine?.capabilities as { effective_mode?: string } | undefined;
    return capabilities?.effective_mode ?? "preview";
  }, [engine]);

  async function refreshHealth() {
    const response = await fetch("/api/medikal-simulasyon/engine", { cache: "no-store" });
    const body = (await response.json()) as EngineState;
    setEngine(body);
  }

  useEffect(() => {
    refreshHealth().catch((reason) => {
      setError(reason instanceof Error ? reason.message : "Motor durumu alınamadı.");
    });
  }, []);

  useEffect(() => {
    if (!job || ["completed", "failed"].includes(job.status)) return;
    const timer = window.setInterval(async () => {
      const response = await fetch(
        `/api/medikal-simulasyon/engine?job_id=${encodeURIComponent(job.job_id)}`,
        { cache: "no-store" },
      );
      const body = (await response.json()) as SceneJob;
      setJob(body);
    }, 1400);
    return () => window.clearInterval(timer);
  }, [job]);

  async function startExample() {
    setBusy(true);
    setError(null);
    setJob(null);
    try {
      let sample = fallbackSample;
      const sampleResponse = await fetch(
        "/api/medikal-simulasyon/engine?example=stemi-vf",
        { cache: "no-store" },
      );
      if (sampleResponse.ok) {
        sample = await sampleResponse.json();
      }
      const response = await fetch("/api/medikal-simulasyon/engine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sample),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.message ?? body.detail ?? "Üretim işi başlatılamadı.");
      }
      setJob(body as SceneJob);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Üretim işi başlatılamadı.");
    } finally {
      setBusy(false);
    }
  }

  const validation = job?.artifact?.validation;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <a href="/medikal-simulasyon" className={styles.backLink}>
          ← Medikal Simülasyona dön
        </a>
        <div className={styles.brandRow}>
          <span className={styles.badge}>TEYS / MAMS</span>
          <span className={styles.pilot}>KONTROLLÜ PİLOT</span>
        </div>
        <h1>AI + Manim Klinik Görselleştirme Motoru</h1>
        <p>
          Yapılandırılmış sentetik klinik olayları; storyboard, güvenlik doğrulaması,
          Türkçe anlatım ve izole Manim render işine dönüştüren servis konsolu.
        </p>
      </header>

      <section className={styles.grid}>
        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <small>MOTOR DURUMU</small>
              <h2>{engine?.status ?? "Kontrol ediliyor"}</h2>
            </div>
            <span className={`${styles.statusDot} ${effectiveMode === "render" ? styles.live : ""}`} />
          </div>
          <dl className={styles.metrics}>
            <div><dt>Etkin mod</dt><dd>{effectiveMode}</dd></div>
            <div><dt>Upstream</dt><dd>{String((engine?.capabilities as JsonRecord | undefined)?.upstream_present ?? true)}</dd></div>
            <div><dt>Ham kod uç noktası</dt><dd>Kapalı</dd></div>
            <div><dt>Program bileşimi</dt><dd>%70 / %30</dd></div>
          </dl>
          <p className={styles.note}>
            {engine?.message ?? "Motor sağlık ve yetenek sözleşmesi yüklendi."}
          </p>
          <button className={styles.secondaryButton} type="button" onClick={() => refreshHealth()}>
            Durumu yenile
          </button>
        </article>

        <article className={`${styles.card} ${styles.actionCard}`}>
          <small>GERÇEK ENTEGRASYON AKIŞI</small>
          <h2>Sentetik STEMI → VF ekip senaryosu</h2>
          <p>
            İstek; gerçek hasta verisi içermez. Uzman onayı, kaynak kaydı ve güvenlik
            kısıtları bulunmadan AI veya render hattına alınmaz.
          </p>
          <ol>
            <li>Yapılandırılmış klinik durum</li>
            <li>AI storyboard ve Manim kodu</li>
            <li>Sözdizimi, yerleşim, anlatım ve sandbox kapıları</li>
            <li>İzinli ortamda video render</li>
          </ol>
          <button className={styles.primaryButton} type="button" onClick={startExample} disabled={busy}>
            {busy ? "İş hazırlanıyor…" : "Örnek üretim işini başlat"}
          </button>
          {error ? <p className={styles.error}>{error}</p> : null}
        </article>
      </section>

      {job ? (
        <section className={styles.jobPanel} aria-live="polite">
          <div className={styles.jobTop}>
            <div><small>İŞ KİMLİĞİ</small><strong>{job.job_id}</strong></div>
            <span>{job.status}</span>
          </div>
          <div className={styles.progress}><i style={{ width: `${Math.round(job.progress * 100)}%` }} /></div>
          <div className={styles.jobDetails}>
            <div><small>İlerleme</small><strong>%{Math.round(job.progress * 100)}</strong></div>
            <div><small>Sahne sınıfı</small><strong>{job.artifact?.scene_class_name ?? "—"}</strong></div>
            <div><small>Video</small><strong>{job.artifact?.video_url ? "Hazır" : "Kod/plan"}</strong></div>
          </div>
          {validation ? (
            <div className={styles.validationGrid}>
              <span data-pass={validation.syntax_valid}>Sözdizimi</span>
              <span data-pass={validation.spatial_valid}>Yerleşim</span>
              <span data-pass={validation.voiceover_valid}>Anlatım</span>
              <span data-pass={validation.security_valid}>Sandbox</span>
            </div>
          ) : null}
          {job.error ? <p className={styles.error}>{job.error}</p> : null}
          {job.artifact?.video_url ? (
            <a className={styles.videoLink} href={job.artifact.video_url} target="_blank" rel="noreferrer">
              Render edilen videoyu aç ↗
            </a>
          ) : null}
        </section>
      ) : null}

      <section className={styles.boundary}>
        <strong>Güvenlik sınırı</strong>
        <p>
          Bu motor tıp eğitimi simülasyonu üretir; klinik karar desteği veya gerçek hasta bakım aracı değildir.
          Ham Python kabul edilmez, gerçek hasta verisi reddedilir ve render yalnız izole container içinde açılır.
        </p>
      </section>
    </main>
  );
}
