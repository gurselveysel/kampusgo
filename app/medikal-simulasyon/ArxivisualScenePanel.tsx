"use client";

import { useEffect, useState } from "react";
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

type GatewayState = "checking" | "disabled" | "locked" | "ready" | "unavailable";

type SceneJob = {
  job_id: string;
  status: "queued" | "generating" | "validating" | "rendering" | "completed" | "failed";
  progress: number;
  current_step: string;
  output?: {
    scene_title: string;
    clinical_summary: string;
    debrief_question: string;
    video_id: string;
  } | null;
  error?: string | null;
};

const ACTION_CATEGORY: Record<string, string> = {
  İletişim: "communication",
  Gözlem: "assessment",
  Anamnez: "history",
  Muayene: "examination",
  "Klinik Akıl Yürütme": "reasoning",
  Tetkik: "diagnostic_test",
  Tedavi: "medication",
  Müdahale: "procedure",
  Resüsitasyon: "resuscitation",
  "Ekip Yönetimi": "team_management",
  "Devir Teslim": "handoff",
  "Yeniden Değerlendirme": "reassessment",
};

function consciousnessForPhase(phase: PatientPhase): "alert" | "verbal" | "unresponsive" {
  if (phase === "vf") return "unresponsive";
  if (phase === "rosc") return "verbal";
  return "alert";
}

function painForPhase(phase: PatientPhase): number {
  if (phase === "vf") return 0;
  if (phase === "rosc") return 2;
  return 9;
}

function serializePatientState(vitals: VitalState, phase: PatientPhase) {
  return {
    phase,
    consciousness: consciousnessForPhase(phase),
    pain_score: painForPhase(phase),
    heart_rate: vitals.heartRate,
    systolic_bp: vitals.systolic,
    diastolic_bp: vitals.diastolic,
    spo2: vitals.spo2,
    respiratory_rate: vitals.respiratoryRate,
    temperature_c: vitals.temperature,
    rhythm: vitals.rhythm,
  };
}

function responseDetail(body: unknown, fallback: string): string {
  if (typeof body === "object" && body !== null && "detail" in body) {
    const detail = (body as { detail?: unknown }).detail;
    if (typeof detail === "string" && detail.trim()) return detail;
  }
  return fallback;
}

export default function ArxivisualScenePanel({
  context,
}: {
  context: ArxivisualSceneContext | null;
}) {
  const [gateway, setGateway] = useState<GatewayState>("checking");
  const [accessToken, setAccessToken] = useState("");
  const [approvalReference, setApprovalReference] = useState("");
  const [message, setMessage] = useState("Motor durumu doğrulanıyor…");
  const [job, setJob] = useState<SceneJob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function inspectGateway() {
      try {
        const response = await fetch("/api/medical-simulation/pilot", { cache: "no-store" });
        const body = (await response.json()) as { configured?: boolean; access?: boolean };
        if (cancelled) return;
        if (body.configured === false) {
          setGateway("disabled");
          setMessage("Bu önizlemede arXivisual sunucu geçidi henüz etkin değil.");
        } else if (response.ok && body.access) {
          setGateway("ready");
          setMessage("arXivisual AI + Manim motoru kontrollü pilot erişimine hazır.");
        } else if (response.ok) {
          setGateway("locked");
          setMessage("Sahne üretimi için ayrı pilot erişim anahtarı gerekir.");
        } else {
          setGateway("unavailable");
          setMessage("Motor yanıtı şu anda doğrulanamadı.");
        }
      } catch {
        if (!cancelled) {
          setGateway("unavailable");
          setMessage("Motor yanıtı şu anda doğrulanamadı.");
        }
      }
    }
    void inspectGateway();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const jobId = job?.job_id;
    const jobStatus = job?.status;
    if (!jobId || !jobStatus || ["completed", "failed"].includes(jobStatus)) return;
    const polledJobId = jobId;
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      try {
        const response = await fetch(
          `/api/medical-simulation/scenes/${encodeURIComponent(polledJobId)}`,
          { cache: "no-store" },
        );
        const body = (await response.json()) as SceneJob;
        if (cancelled) return;
        if (!response.ok) {
          setMessage(responseDetail(body, "Sahne işi sorgulanamadı."));
          return;
        }
        setJob(body);
        if (!["completed", "failed"].includes(body.status)) {
          timeout = setTimeout(poll, 4_000);
        }
      } catch {
        if (!cancelled) setMessage("Sahne işi sorgulanamadı; yeniden denenecek.");
        if (!cancelled) timeout = setTimeout(poll, 4_000);
      }
    }

    timeout = setTimeout(poll, 1_200);
    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [job?.job_id, job?.status]);

  async function unlockPilot() {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/medical-simulation/access", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: accessToken }),
      });
      const body = await response.json();
      if (!response.ok) {
        setMessage(responseDetail(body, "Pilot erişimi açılamadı."));
        return;
      }
      setAccessToken("");
      setGateway("ready");
      setMessage("Pilot oturumu açıldı; anahtar tarayıcıda saklanmadı.");
    } catch {
      setMessage("Pilot erişimi açılamadı.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function createScene() {
    if (!context || approvalReference.trim().length < 6) return;
    setIsSubmitting(true);
    setJob(null);
    setMessage("Onaylı klinik geçiş arXivisual planına aktarılıyor…");

    const payload = {
      scene: {
        scenario_id: "scn_teys_stemi_01",
        scenario_version: "1.0.0",
        module_id: context.module.id,
        learning_objective: context.module.objective,
        patient_state_before: serializePatientState(context.beforeVitals, context.beforePhase),
        learner_action: {
          action_id: context.action.id,
          label: context.action.label,
          category: ACTION_CATEGORY[context.action.group] ?? "reassessment",
          clinical_rationale: context.action.rationale,
        },
        patient_state_after: serializePatientState(context.afterVitals, context.afterPhase),
        clinical_rationale: context.action.feedback,
        visual_focus: `${context.action.shortLabel}: ${context.action.description}`,
        voiceover_language: "tr",
        duration_seconds: 20,
        safety_constraints: [
          "Yalnız sağlanan sentetik önce-sonra durumunu canlandır.",
          "Yeni tanı, doz, kontrendikasyon veya fizyolojik değer üretme.",
          "Sentetik hasta ve eğitim simülasyonu etiketini görünür tut.",
          "Gerçek klinik karar desteği izlenimi oluşturma.",
        ],
        expert_approval_reference: approvalReference.trim(),
        source_references: [
          {
            source_id: "TEYS-SYNTHETIC-STEMI",
            source_version: "1.0.0",
            locator: `module-${context.module.id}/${context.action.id}`,
          },
        ],
      },
      quality: "low_quality",
      voiceover_enabled: false,
    };

    try {
      const response = await fetch("/api/medical-simulation/scenes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) {
        setMessage(responseDetail(body, "Sahne işi başlatılamadı."));
        return;
      }
      setJob(body as SceneJob);
      setMessage("arXivisual AI üretimi sıraya alındı.");
    } catch {
      setMessage("Sahne işi başlatılamadı.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const active = job ? !["completed", "failed"].includes(job.status) : false;
  const videoUrl = job?.status === "completed" && job.output
    ? `/api/medical-simulation/video/${encodeURIComponent(job.output.video_id)}`
    : null;

  return (
    <section className={styles.arxivisualPanel} aria-labelledby="arxivisual-panel-title">
      <div className={styles.arxivisualHeader}>
        <div>
          <span>ARXIVISUAL · GERÇEK AI + MANIM HATTI</span>
          <h3 id="arxivisual-panel-title">Son klinik kararını animasyonlu sahneye dönüştür</h3>
        </div>
        <i className={styles[`engine-${gateway}`]}>{gateway === "ready" ? "Hazır" : gateway}</i>
      </div>

      <p className={styles.engineMessage} aria-live="polite">{message}</p>

      <div className={styles.renderProof}>
        <video
          controls
          playsInline
          preload="metadata"
          src="/assets/medical-simulation/arxivisual-stemi-preview.mp4"
        >
          Tarayıcınız MP4 video oynatmayı desteklemiyor.
        </video>
        <div>
          <span>YEREL RENDER KANITI</span>
          <strong>arXivisual renderer → gerçek Manim MP4</strong>
          <p>Sentetik STEMI–VF–ROSC geçişi; AI üretimi değil, güvenli render hattının doğrulanmış örneğidir.</p>
        </div>
      </div>

      {gateway === "locked" ? (
        <div className={styles.engineAccessForm}>
          <label htmlFor="medical-pilot-key">Pilot erişim anahtarı</label>
          <div>
            <input
              id="medical-pilot-key"
              type="password"
              autoComplete="off"
              value={accessToken}
              onChange={(event) => setAccessToken(event.target.value.slice(0, 256))}
              placeholder="Ayrı pilot anahtarını gir"
            />
            <button type="button" onClick={unlockPilot} disabled={isSubmitting || !accessToken.trim()}>
              Erişimi aç
            </button>
          </div>
          <small>Anahtar localStorage’a yazılmaz; sekiz saatlik HttpOnly oturum oluşturulur.</small>
        </div>
      ) : null}

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
          Bir klinik karar uygula; motor yalnız o kararın sentetik önce-sonra geçişini kullanır.
        </div>
      )}

      {gateway === "ready" ? (
        <div className={styles.sceneApprovalForm}>
          <label htmlFor="expert-approval-reference">Uzman onay referansı</label>
          <input
            id="expert-approval-reference"
            value={approvalReference}
            onChange={(event) => setApprovalReference(event.target.value.slice(0, 200))}
            placeholder="Örn. kurum-onay-kayıt-numarası"
          />
          <button
            type="button"
            onClick={createScene}
            disabled={isSubmitting || active || !context || approvalReference.trim().length < 6}
          >
            {active ? "Sahne üretiliyor…" : "arXivisual sahnesi üret"}
          </button>
        </div>
      ) : null}

      {job ? (
        <div className={styles.sceneJob}>
          <div>
            <span>{job.current_step.replaceAll("_", " ")}</span>
            <strong>%{job.progress}</strong>
          </div>
          <div className={styles.sceneProgress} aria-label={`Sahne üretimi yüzde ${job.progress}`}>
            <i style={{ width: `${job.progress}%` }} />
          </div>
          {job.status === "failed" ? <p>{job.error ?? "Sahne üretimi tamamlanamadı."}</p> : null}
        </div>
      ) : null}

      {videoUrl && job?.output ? (
        <div className={styles.generatedScene}>
          <video controls playsInline preload="metadata" src={videoUrl}>
            Tarayıcınız MP4 video oynatmayı desteklemiyor.
          </video>
          <div>
            <span>ARXIVISUAL / MANIM ÇIKTISI</span>
            <strong>{job.output.scene_title}</strong>
            <p>{job.output.debrief_question}</p>
          </div>
        </div>
      ) : null}

      <footer>
        AI klinik karar vermez; yalnız onaylı sentetik durum geçişini görselleştirir. Production: NO-GO.
      </footer>
    </section>
  );
}
