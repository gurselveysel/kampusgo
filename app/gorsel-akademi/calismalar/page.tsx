"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import styles from "./calismalar.module.css";

type SessionState = "checking" | "disabled" | "locked" | "authenticated";
type ProcessState = "idle" | "submitting" | "polling" | "loading-paper" | "ready" | "error";

type StepInfo = {
  name: string;
  status: string;
  duration_ms?: number | null;
};

type JobStatus = {
  job_id: string;
  arxiv_id: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  current_step?: string | null;
  sections_completed?: number;
  sections_total?: number;
  steps_completed?: StepInfo[];
  error?: string | null;
  created_at?: string;
  estimated_completion?: string | null;
};

type Visualization = {
  id: string;
  section_id: string;
  concept: string;
  video_url?: string | null;
  status: "pending" | "rendering" | "complete" | "failed";
};

type PaperSection = {
  id: string;
  title: string;
  content: string;
  summary?: string | null;
  level: number;
  order_index: number;
  equations?: string[];
  video_url?: string | null;
};

type PaperResult = {
  paper_id: string;
  title: string;
  authors: string[];
  abstract: string;
  pdf_url: string;
  html_url?: string | null;
  sections: PaperSection[];
  visualizations: Visualization[];
  processed_at: string;
};

type ApiErrorBody = {
  detail?: string;
  status?: string;
};

const STATUS_LABELS: Record<string, string> = {
  queued: "Kuyrukta",
  processing: "İşleniyor",
  completed: "Tamamlandı",
  failed: "Başarısız",
  pending: "Bekliyor",
  in_progress: "Devam ediyor",
  complete: "Tamamlandı",
};

const STEP_LABELS: Record<string, string> = {
  fetch_paper: "Makaleyi getir",
  parse_sections: "Bölümleri ayrıştır",
  generate_visualizations: "Görselleştirmeleri üret",
  render_videos: "Videoları render et",
};

async function readJson<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(`Beklenmeyen yanıt biçimi: HTTP ${response.status}`);
  }

  const body = (await response.json()) as T & ApiErrorBody;
  if (!response.ok) {
    throw new Error(body.detail || `İstek tamamlanamadı: HTTP ${response.status}`);
  }
  return body;
}

function percent(value: number | undefined): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round((value ?? 0) * 100)));
}

function statusText(value: string | undefined): string {
  return value ? STATUS_LABELS[value] ?? value : "Bekleniyor";
}

function sectionExcerpt(section: PaperSection): string {
  const source = section.summary?.trim() || section.content?.trim() || "Bu bölüm için özet bulunmuyor.";
  return source.length > 760 ? `${source.slice(0, 757)}…` : source;
}

export default function VisualLabWorkbenchPage() {
  const [session, setSession] = useState<SessionState>("checking");
  const [accessToken, setAccessToken] = useState("");
  const [arxivId, setArxivId] = useState("1706.03762");
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [processState, setProcessState] = useState<ProcessState>("idle");
  const [job, setJob] = useState<JobStatus | null>(null);
  const [paper, setPaper] = useState<PaperResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const checkSession = useCallback(async () => {
    setSession("checking");
    try {
      const response = await fetch("/api/visual-lab/access", { cache: "no-store" });
      const body = (await response.json()) as ApiErrorBody;
      if (body.status === "authenticated") setSession("authenticated");
      else if (body.status === "disabled") setSession("disabled");
      else setSession("locked");
    } catch {
      setSession("disabled");
    }
  }, []);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  const loadPaper = useCallback(async (paperId: string) => {
    setProcessState("loading-paper");
    const response = await fetch(`/api/visual-lab/paper/${encodeURIComponent(paperId)}`, {
      cache: "no-store",
    });
    const result = await readJson<PaperResult>(response);
    setPaper(result);
    setProcessState("ready");
  }, []);

  const pollJob = useCallback(
    async (jobId: string) => {
      try {
        const response = await fetch(`/api/visual-lab/status/${encodeURIComponent(jobId)}`, {
          cache: "no-store",
        });
        const nextJob = await readJson<JobStatus>(response);
        setJob(nextJob);

        if (nextJob.status === "completed") {
          await loadPaper(nextJob.arxiv_id);
        } else if (nextJob.status === "failed") {
          setProcessState("error");
          setMessage(nextJob.error || "Visual Lab işi tamamlanamadı.");
        } else {
          setProcessState("polling");
        }
      } catch (error) {
        setProcessState("error");
        setMessage(error instanceof Error ? error.message : "İş durumu alınamadı.");
      }
    },
    [loadPaper],
  );

  useEffect(() => {
    if (!job || !["queued", "processing"].includes(job.status)) return;
    if (processState !== "polling") return;

    const timer = window.setTimeout(() => {
      void pollJob(job.job_id);
    }, 4_000);

    return () => window.clearTimeout(timer);
  }, [job, pollJob, processState]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    try {
      const response = await fetch("/api/visual-lab/access", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: accessToken }),
      });
      await readJson<{ status: string }>(response);
      setAccessToken("");
      setSession("authenticated");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Pilot erişimi doğrulanamadı.");
    }
  }

  async function signOut() {
    await fetch("/api/visual-lab/access", { method: "DELETE" });
    setSession("locked");
    setJob(null);
    setPaper(null);
    setRightsConfirmed(false);
    setProcessState("idle");
    setMessage(null);
  }

  async function startProcessing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!rightsConfirmed) {
      setProcessState("error");
      setMessage(
        "Kaynağı işleme ve türev görsel anlatım üretme hakkının bulunduğunu onaylamalısınız.",
      );
      return;
    }

    setPaper(null);
    setJob(null);
    setProcessState("submitting");

    try {
      const response = await fetch("/api/visual-lab/process", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ arxiv_id: arxivId, rights_confirmed: true }),
      });
      const created = await readJson<{
        job_id: string;
        arxiv_id: string;
        status: "queued" | "processing";
        message: string;
      }>(response);

      const initialJob: JobStatus = {
        job_id: created.job_id,
        arxiv_id: created.arxiv_id,
        status: created.status,
        progress: 0,
        current_step: created.message,
        steps_completed: [],
      };
      setJob(initialJob);
      setProcessState("polling");
      await pollJob(created.job_id);
    } catch (error) {
      setProcessState("error");
      setMessage(error instanceof Error ? error.message : "Visual Lab işi başlatılamadı.");
    }
  }

  const completedVisualizations = useMemo(
    () => paper?.visualizations.filter((item) => item.status === "complete").length ?? 0,
    [paper],
  );

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <a className={styles.brand} href="/gorsel-akademi">
          <span aria-hidden="true">GO</span>
          <div>
            <strong>KampüsGO</strong>
            <small>Visual Lab Çalışma Alanı</small>
          </div>
        </a>
        <nav>
          <a href="/gorsel-akademi/motor">Motor durumu</a>
          <a href="/gorsel-akademi">Görsel Akademi</a>
        </nav>
      </header>

      <div className={styles.pilotBanner}>
        <strong>KONTROLLÜ PİLOT</strong>
        <span>Yalnız kullanım hakkı doğrulanmış kaynaklarla çalışın. Production yayını kapalıdır.</span>
      </div>

      <section className={styles.hero}>
        <div>
          <span className={styles.kicker}>ARXIV → ANALİZ → MANIM → SESLİ GÖRSEL HİKÂYE</span>
          <h1>Bir araştırma makalesini izlenebilir görsel anlatıma dönüştür.</h1>
          <p>
            İş burada başlatılır; analiz ve render ayrı container servisinde yürütülür.
            KampüsGO yalnız güvenli geçit, ilerleme takibi ve sonuç görüntüleme görevini üstlenir.
          </p>
        </div>
        {session === "authenticated" ? (
          <button className={styles.ghostButton} type="button" onClick={() => void signOut()}>
            Pilot oturumunu kapat
          </button>
        ) : null}
      </section>

      {session === "checking" ? (
        <section className={styles.noticeCard}>
          <span className={styles.spinner} aria-hidden="true" />
          <div>
            <strong>Pilot erişimi kontrol ediliyor</strong>
            <p>Sunucu geçidi ve HttpOnly oturum durumu doğrulanıyor.</p>
          </div>
        </section>
      ) : null}

      {session === "disabled" ? (
        <section className={`${styles.noticeCard} ${styles.warningCard}`}>
          <span aria-hidden="true">!</span>
          <div>
            <strong>Visual Lab geçidi henüz etkin değil</strong>
            <p>
              Backend container adresi, servis anahtarı ve pilot erişim anahtarı tanımlandıktan sonra
              <code> VISUAL_LAB_GATEWAY_ENABLED=true </code> yapılmalıdır.
            </p>
            <a href="/gorsel-akademi/motor">Teknik durum ekranını aç</a>
          </div>
        </section>
      ) : null}

      {session === "locked" ? (
        <section className={styles.accessPanel}>
          <div>
            <span>YETKİ KAPISI</span>
            <h2>Kontrollü pilot çalışma alanını aç</h2>
            <p>
              Pilot anahtarı yalnız oturum oluşturmak için kullanılır; tarayıcı depolamasına yazılmaz ve
              Visual Lab servis anahtarıyla aynı değildir.
            </p>
          </div>
          <form onSubmit={signIn}>
            <label htmlFor="visual-lab-token">Pilot erişim anahtarı</label>
            <input
              id="visual-lab-token"
              type="password"
              autoComplete="off"
              value={accessToken}
              onChange={(event) => setAccessToken(event.target.value)}
              minLength={32}
              required
              placeholder="En az 32 karakter"
            />
            <button type="submit">Çalışma alanını aç</button>
          </form>
        </section>
      ) : null}

      {session === "authenticated" ? (
        <>
          <section className={styles.workspace}>
            <div className={styles.formColumn}>
              <span className={styles.sectionLabel}>01 · YENİ İŞ</span>
              <h2>Makale kimliğini gir</h2>
              <p>
                Modern arXiv kimliği veya arXiv bağlantısı kabul edilir. Pilot, eski slash içeren kimlikleri
                güvenli path desteği tamamlanana kadar reddeder.
              </p>
              <form onSubmit={startProcessing}>
                <label htmlFor="arxiv-id">arXiv kimliği veya bağlantısı</label>
                <input
                  id="arxiv-id"
                  type="text"
                  value={arxivId}
                  onChange={(event) => setArxivId(event.target.value)}
                  required
                  maxLength={160}
                  placeholder="1706.03762"
                />
                <label className={styles.rightsCheck} htmlFor="source-rights-confirmed">
                  <input
                    id="source-rights-confirmed"
                    type="checkbox"
                    checked={rightsConfirmed}
                    onChange={(event) => setRightsConfirmed(event.target.checked)}
                    required
                  />
                  <span>
                    Bu kaynağı işleme ve türev görsel anlatım üretme hakkımın bulunduğunu onaylıyorum.
                  </span>
                </label>
                <button
                  type="submit"
                  disabled={
                    !rightsConfirmed ||
                    ["submitting", "polling", "loading-paper"].includes(processState)
                  }
                >
                  {processState === "submitting" ? "İş oluşturuluyor…" : "Görsel anlatıyı üret"}
                </button>
              </form>
              <div className={styles.boundaries}>
                <span>✓ Kaynak kullanım hakkı açıkça onaylanır</span>
                <span>✓ Ham Python kabul edilmez</span>
                <span>✓ Servis anahtarı tarayıcıya verilmez</span>
                <span>✓ Aynı makale için mükerrer iş engeli</span>
              </div>
            </div>

            <div className={styles.statusColumn}>
              <div className={styles.statusHeader}>
                <span className={styles.sectionLabel}>02 · İŞ DURUMU</span>
                {job ? <b className={`${styles.jobPill} ${styles[job.status]}`}>{statusText(job.status)}</b> : null}
              </div>

              {!job ? (
                <div className={styles.emptyState}>
                  <span aria-hidden="true">◇</span>
                  <strong>Henüz bir üretim işi başlatılmadı</strong>
                  <p>İş oluşturulduğunda aşamalar, ilerleme ve hata kayıtları burada görünür.</p>
                </div>
              ) : (
                <div className={styles.jobPanel}>
                  <div className={styles.jobIdentity}>
                    <div>
                      <small>İş kimliği</small>
                      <code>{job.job_id}</code>
                    </div>
                    <div>
                      <small>Makale</small>
                      <strong>{job.arxiv_id}</strong>
                    </div>
                  </div>
                  <div className={styles.progressMeta}>
                    <span>{job.current_step || statusText(job.status)}</span>
                    <strong>{percent(job.progress)}%</strong>
                  </div>
                  <div className={styles.progressTrack} aria-label={`İlerleme yüzde ${percent(job.progress)}`}>
                    <span style={{ width: `${percent(job.progress)}%` }} />
                  </div>
                  <div className={styles.stepList}>
                    {(job.steps_completed?.length
                      ? job.steps_completed
                      : [
                          { name: "fetch_paper", status: "pending" },
                          { name: "parse_sections", status: "pending" },
                          { name: "generate_visualizations", status: "pending" },
                          { name: "render_videos", status: "pending" },
                        ]
                    ).map((step) => (
                      <div key={step.name} className={styles.stepRow}>
                        <span className={`${styles.stepDot} ${styles[step.status]}`} aria-hidden="true" />
                        <strong>{STEP_LABELS[step.name] ?? step.name}</strong>
                        <small>{statusText(step.status)}</small>
                      </div>
                    ))}
                  </div>
                  {job.sections_total ? (
                    <p className={styles.sectionCounter}>
                      Bölüm ilerlemesi: {job.sections_completed ?? 0} / {job.sections_total}
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          </section>

          {message ? <div className={styles.errorMessage}>{message}</div> : null}

          {paper ? (
            <section className={styles.resultSection}>
              <div className={styles.resultHeader}>
                <div>
                  <span className={styles.sectionLabel}>03 · SONUÇ</span>
                  <h2>{paper.title}</h2>
                  <p>{paper.authors.join(", ")}</p>
                </div>
                <div className={styles.resultStats}>
                  <div>
                    <strong>{paper.sections.length}</strong>
                    <span>Bölüm</span>
                  </div>
                  <div>
                    <strong>{completedVisualizations}</strong>
                    <span>Video</span>
                  </div>
                  <a href={paper.pdf_url} target="_blank" rel="noreferrer">
                    Kaynak PDF
                  </a>
                </div>
              </div>

              <article className={styles.abstractCard}>
                <span>ÖZET</span>
                <p>{paper.abstract}</p>
              </article>

              <div className={styles.sectionGrid}>
                {paper.sections.slice(0, 20).map((section, index) => (
                  <article className={styles.sectionCard} key={section.id}>
                    <div className={styles.sectionCardHeader}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <small>{section.video_url ? "Görsel anlatım hazır" : "Metin özeti"}</small>
                    </div>
                    <h3>{section.title || `Bölüm ${index + 1}`}</h3>
                    <p>{sectionExcerpt(section)}</p>
                    {section.video_url ? (
                      <video controls preload="metadata" src={section.video_url}>
                        Tarayıcınız video oynatmayı desteklemiyor.
                      </video>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      <footer className={styles.footer}>
        <div>
          <strong>KampüsGO Visual Lab</strong>
          <span>Gürsel Online Eğitim ve Bilgi Teknolojileri A.Ş.</span>
        </div>
        <b>Production kararı: NO-GO</b>
      </footer>
    </main>
  );
}
