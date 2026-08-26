"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./motor.module.css";

type GatewayResult = {
  status?: string;
  upstreamStatus?: number;
  upstream?: Record<string, unknown>;
  missing?: string[];
  productionAllowed?: boolean;
};

type CheckState = {
  phase: "loading" | "ready" | "error";
  health: GatewayResult | null;
  pilot: GatewayResult | null;
  checkedAt: string | null;
};

const initialState: CheckState = {
  phase: "loading",
  health: null,
  pilot: null,
  checkedAt: null,
};

function statusLabel(value?: string): string {
  switch (value) {
    case "reachable":
      return "Motor erişilebilir";
    case "authenticated":
      return "Güvenli geçit doğrulandı";
    case "not_configured":
      return "Henüz yapılandırılmadı";
    case "timeout":
      return "Zaman aşımı";
    case "unreachable":
      return "Motor erişilemiyor";
    case "upstream_error":
      return "Motor hata döndürdü";
    default:
      return "Durum bilinmiyor";
  }
}

function tone(value?: string): "success" | "warning" | "danger" | "neutral" {
  if (value === "reachable" || value === "authenticated") return "success";
  if (value === "not_configured") return "warning";
  if (value === "timeout" || value === "unreachable" || value === "upstream_error") {
    return "danger";
  }
  return "neutral";
}

export default function VisualLabMotorPage() {
  const [state, setState] = useState<CheckState>(initialState);

  const runChecks = useCallback(async () => {
    setState((current) => ({ ...current, phase: "loading" }));

    try {
      const [healthResponse, pilotResponse] = await Promise.all([
        fetch("/api/visual-lab/health", { cache: "no-store" }),
        fetch("/api/visual-lab/pilot", { cache: "no-store" }),
      ]);

      const [health, pilot] = (await Promise.all([
        healthResponse.json(),
        pilotResponse.json(),
      ])) as [GatewayResult, GatewayResult];

      setState({
        phase: healthResponse.ok && pilotResponse.ok ? "ready" : "error",
        health,
        pilot,
        checkedAt: new Date().toLocaleString("tr-TR"),
      });
    } catch {
      setState({
        phase: "error",
        health: { status: "unreachable", productionAllowed: false },
        pilot: { status: "unreachable", productionAllowed: false },
        checkedAt: new Date().toLocaleString("tr-TR"),
      });
    }
  }, []);

  useEffect(() => {
    void runChecks();
  }, [runChecks]);

  const healthStatus = state.health?.status;
  const pilotStatus = state.pilot?.status;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <a className={styles.brand} href="/gorsel-akademi">
          <span aria-hidden="true">GO</span>
          <div>
            <strong>KampüsGO</strong>
            <small>Visual Lab Motor Durumu</small>
          </div>
        </a>
        <a className={styles.backLink} href="/gorsel-akademi">
          Görsel Akademi’ye dön
        </a>
      </header>

      <section className={styles.hero}>
        <div>
          <span className={styles.kicker}>KONTROLLÜ PİLOT · TEKNİK DOĞRULAMA</span>
          <h1>Görsel öğrenme motorunun bağlantı ve güvenlik durumunu doğrula.</h1>
          <p>
            Bu ekran, KampüsGO’nun sunucu taraflı geçidi ile ayrı FastAPI/Manim
            servisinin erişilebilirliğini kontrol eder. Herhangi bir içerik üretim işi
            başlatmaz.
          </p>
        </div>
        <button className={styles.refreshButton} type="button" onClick={() => void runChecks()}>
          {state.phase === "loading" ? "Kontrol ediliyor…" : "Durumu yenile"}
        </button>
      </section>

      <section className={styles.statusGrid} aria-live="polite">
        <article className={`${styles.statusCard} ${styles[tone(healthStatus)]}`}>
          <div className={styles.cardHeading}>
            <span>01</span>
            <small>Genel sağlık</small>
          </div>
          <h2>{state.phase === "loading" ? "Kontrol ediliyor" : statusLabel(healthStatus)}</h2>
          <p>
            Next.js sunucusu, Visual Lab servisinin herkese açık sağlık uç noktasına
            en fazla beş saniyelik süre sınırıyla erişir.
          </p>
          <dl>
            <div>
              <dt>Gateway durumu</dt>
              <dd>{healthStatus ?? "bekleniyor"}</dd>
            </div>
            <div>
              <dt>Upstream HTTP</dt>
              <dd>{state.health?.upstreamStatus ?? "—"}</dd>
            </div>
          </dl>
        </article>

        <article className={`${styles.statusCard} ${styles[tone(pilotStatus)]}`}>
          <div className={styles.cardHeading}>
            <span>02</span>
            <small>Servis anahtarı</small>
          </div>
          <h2>{state.phase === "loading" ? "Kontrol ediliyor" : statusLabel(pilotStatus)}</h2>
          <p>
            Sunucuda tutulan servis anahtarı, korunan `/api/pilot` uç noktasına
            gönderilir; anahtar tarayıcıya aktarılmaz.
          </p>
          <dl>
            <div>
              <dt>Eksik ayar</dt>
              <dd>{state.pilot?.missing?.join(", ") || "—"}</dd>
            </div>
            <div>
              <dt>Production</dt>
              <dd>Kapalı</dd>
            </div>
          </dl>
        </article>
      </section>

      <section className={styles.sourcePanel}>
        <div>
          <span>PINNED UPSTREAM</span>
          <h2>arXivisual kaynak tabanı</h2>
          <p>
            Kaynak çalışma ağacı değişmez bir commit’e sabitlenmiş, SHA-256 dosya
            manifestiyle doğrulanmış ve KampüsGO güvenlik overlay’lerinden ayrılmıştır.
          </p>
        </div>
        <code>bbdbc8768948ed201b2825d2618dea3e8f1f7ea1</code>
      </section>

      <section className={styles.controls}>
        <div className={styles.sectionHeading}>
          <span>Etkin güvenlik sınırları</span>
          <h2>Pilot motor, doğrudan production servisi değildir.</h2>
        </div>
        <div className={styles.controlGrid}>
          {[
            ["Ham render", "Varsayılan kapalı"],
            ["API erişimi", "Servis anahtarı zorunlu"],
            ["Container", "Non-root ve capability’siz"],
            ["Kaynak sınırı", "1 MB istek gövdesi"],
            ["Kaynak tüketimi", "CPU, RAM ve PID kotası"],
            ["Yayın", "Eğitici onayı olmadan kapalı"],
          ].map(([title, description]) => (
            <article key={title}>
              <span aria-hidden="true">✓</span>
              <div>
                <strong>{title}</strong>
                <small>{description}</small>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className={styles.footer}>
        <span>Son kontrol: {state.checkedAt ?? "henüz yapılmadı"}</span>
        <strong>Production kararı: NO-GO</strong>
      </footer>
    </main>
  );
}
