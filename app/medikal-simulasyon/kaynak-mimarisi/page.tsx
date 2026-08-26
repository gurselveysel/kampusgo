import type { Metadata } from "next";
import registryData from "../../../services/medical-simulation-engine/open-source-sources.json";
import { buildSourceUsageRecord, type SourceUsageRecord, type SourceUsageRole } from "../../../services/medical-simulation-engine/source-usage.js";
import styles from "./source-architecture.module.css";

type Adoption = "candidate" | "isolated-service" | "reference" | "blocked" | "retired-reference";

type SourceRecord = {
  order: number;
  repository: string;
  url: string;
  branch: string;
  commit: string;
  license: string;
  licenseClass: string;
  capability: string;
  adoption: Adoption;
  use: string;
  note: string;
};

export const metadata: Metadata = {
  title: "40 Kaynaklı Simülasyon Mimarisi | TEYS",
  description: "TEYS medikal simülasyon pilotunun 40 GitHub kaynağına dayalı, lisans kapılı entegrasyon haritası.",
};

const sources = (registryData.sources as SourceRecord[]).map(buildSourceUsageRecord) as SourceUsageRecord[];

const layerDefinitions = [
  {
    id: "patient",
    eyebrow: "01 · KLİNİK DENEYİM",
    title: "Sanal hasta, acil durum ve mobil deneyim",
    capabilities: ["virtual-patient", "emergency-simulation", "mobile-simulation"],
  },
  {
    id: "agents",
    eyebrow: "02 · YAPAY HASTA",
    title: "LLM hasta, çok ajan ve değerlendirme",
    capabilities: ["llm-patient", "llm-evaluation", "research-catalogue"],
  },
  {
    id: "physiology",
    eyebrow: "03 · FİZYOLOJİ",
    title: "Fizyoloji, acil yanıt ve cihaz telemetrisi",
    capabilities: ["physiology", "medical-devices"],
  },
  {
    id: "procedure",
    eyebrow: "04 · PROSEDÜR",
    title: "Cerrahi fizik ve prosedürel simülasyon",
    capabilities: ["surgical-physics", "procedural-simulation"],
  },
  {
    id: "authoring",
    eyebrow: "05 · ORKESTRASYON",
    title: "Durum makinesi ve senaryo yazarlığı",
    capabilities: ["orchestration", "scenario-authoring"],
  },
  {
    id: "visual",
    eyebrow: "06 · GÖRSEL KATMAN",
    title: "Web 3B ve tıbbi görüntüleme",
    capabilities: ["web-3d", "medical-imaging"],
  },
  {
    id: "data",
    eyebrow: "07 · SENTETİK VERİ",
    title: "Sentetik hasta üretimi",
    capabilities: ["synthetic-data"],
  },
] as const;

const usageRoleLabels: Record<SourceUsageRole, string> = {
  "direct-dependency": "Doğrudan bağımlılık",
  "isolated-adapter": "İzole adaptör sınırı",
  benchmark: "Test / benchmark",
  "architecture-reference": "Mimari / ürün referansı",
  "license-blocked-reference": "Lisans engelli referans",
  "historical-reference": "Tarihsel referans",
};

function countUsage(...roles: SourceUsageRole[]): number {
  const allowed = new Set(roles);
  return sources.filter((source) => allowed.has(source.usageRole)).length;
}

export default function SourceArchitecturePage() {
  const reusableCount = countUsage("direct-dependency", "isolated-adapter", "benchmark");
  const referenceCount = countUsage("architecture-reference", "historical-reference");
  const blockedCount = countUsage("license-blocked-reference");

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <a className={styles.brand} href="/medikal-simulasyon" aria-label="TEYS Medikal Simülasyona dön">
          <span>TEYS</span>
          <div>
            <strong>Kaynak Mimarisi</strong>
            <small>40 GitHub deposu · lisans kapılı kullanım</small>
          </div>
        </a>
        <a className={styles.backLink} href="/medikal-simulasyon">Simülasyona dön →</a>
      </header>

      <section className={styles.hero}>
        <div>
          <span className={styles.kicker}>DOĞRULANMIŞ KAYNAK KÜTÜĞÜ · {registryData.auditedAt}</span>
          <h1>Her kaynak için ayrı rol, ayrı lisans kapısı.</h1>
          <p>
            Bu harita, kırk deponun tamamını tek çalışma zamanına yığmaz. Her projeyi klinik deneyim,
            fizyoloji, 3B, görüntüleme, sentetik veri veya değerlendirme katmanında açık bir göreve bağlar;
            lisans ve güvenlik kapısını geçmeyen kodu ürüne almaz.
          </p>
        </div>
        <aside className={styles.policyCard}>
          <span>ÜRÜN SINIRI</span>
          <strong>Kaynak ≠ klinik doğruluk</strong>
          <p>UÇEP eşlemesi, güncel kılavuz, yerel protokol ve uzman onayı bu listeden bağımsızdır.</p>
        </aside>
      </section>

      <section className={styles.metrics} aria-label="Kaynak denetimi özeti">
        <article><span>Doğrulanan depo</span><strong>{sources.length}</strong><small>Dal + commit izi kayıtlı</small></article>
        <article><span>Adaptör / benchmark</span><strong>{reusableCount}</strong><small>İzole sınır veya ölçüm rolü</small></article>
        <article><span>Mimari / tarihsel</span><strong>{referenceCount}</strong><small>Kod kopyalanmadan kullanılır</small></article>
        <article><span>Engelli</span><strong>{blockedCount}</strong><small>Eksik veya kısıtlı lisans</small></article>
      </section>

      <nav className={styles.layerNav} aria-label="Mimari katmanlar">
        {layerDefinitions.map((layer) => <a key={layer.id} href={`#${layer.id}`}>{layer.title}</a>)}
      </nav>

      <div className={styles.layers}>
        {layerDefinitions.map((layer) => {
          const layerSources = sources.filter((source) => layer.capabilities.includes(source.capability as never));
          return (
            <section className={styles.layer} id={layer.id} key={layer.id}>
              <div className={styles.layerHeading}>
                <div><span>{layer.eyebrow}</span><h2>{layer.title}</h2></div>
                <strong>{layerSources.length} kaynak</strong>
              </div>
              <div className={styles.sourceGrid}>
                {layerSources.map((source) => (
                  <article className={styles.sourceCard} key={source.repository}>
                    <div className={styles.cardTop}>
                      <span>{String(source.order).padStart(2, "0")}</span>
                      <i className={styles[source.adoption]}>{usageRoleLabels[source.usageRole]}</i>
                    </div>
                    <h3>{source.repository}</h3>
                    <p>{source.use}</p>
                    <dl>
                      <div><dt>Lisans</dt><dd>{source.license}</dd></div>
                      <div><dt>Kaynak izi</dt><dd><code>{source.branch}@{source.commit}</code></dd></div>
                      <div><dt>Kullanım rolü</dt><dd>{usageRoleLabels[source.usageRole]}</dd></div>
                      <div><dt>Kod / varlık aktarımı</dt><dd>Hayır · {source.assetLicense}</dd></div>
                      <div><dt>Entegrasyon</dt><dd>{source.integrationStatus}</dd></div>
                      <div><dt>Test kanıtı</dt><dd><code>{source.testEvidence}</code></dd></div>
                      <div><dt>Lisans dosyası</dt><dd>{source.licenseEvidenceFile}</dd></div>
                      <div><dt>Risk</dt><dd>{source.securityRisk} · {source.maintenanceRisk}</dd></div>
                    </dl>
                    <small>{source.note}</small>
                    <a href={source.url} target="_blank" rel="noreferrer">GitHub deposunu aç ↗</a>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <section className={styles.nextSlice}>
        <span>İLK ÇALIŞAN DİKEY DİLİM</span>
        <h2>Olay/durum motoru → fizyoloji → çalışan araçlar → replay → debriefing</h2>
        <ol>
          <li><b>XState eşdeğeri açık makine:</b> klinik faz, ön koşul, geçersiz geçiş, olay hash'i ve deterministik replay çalışıyor.</li>
          <li><b>Deterministik fizyoloji:</b> vital değerler iskemi, perfüzyon, oksijen rezervi ve elektriksel instabiliteden türetiliyor.</li>
          <li><b>Explain Engine / BioGears:</b> kod aktarılmadı; web benchmark ve izole adaptör sınırı olarak kayıtlı.</li>
          <li><b>Three.js / görüntüleme:</b> ağır bağımlılık ve sentetik varlık lisansı doğrulanana kadar mimari referans rolünde.</li>
          <li><b>Synthea / OpenICE:</b> gerçek veri veya canlı cihaz bağlanmadan ayrı süreç sınırında tutuluyor.</li>
        </ol>
        <p>Production durumu: <strong>NO-GO</strong> · Harici kod aktarımı yapılmadı; her gerçek bağımlılık ayrı lisans, SBOM, güvenlik ve performans kapısından geçmelidir.</p>
      </section>
    </main>
  );
}
