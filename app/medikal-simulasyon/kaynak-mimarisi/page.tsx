import type { Metadata } from "next";
import registryData from "../../../services/medical-simulation-engine/open-source-sources.json";
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

const sources = registryData.sources as SourceRecord[];

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

const adoptionLabels: Record<Adoption, string> = {
  candidate: "Entegrasyon adayı",
  "isolated-service": "İzole servis adayı",
  reference: "Mimari / araştırma referansı",
  blocked: "Kod kullanımı engelli",
  "retired-reference": "Tarihsel referans",
};

function countAdoptions(...adoptions: Adoption[]): number {
  const allowed = new Set(adoptions);
  return sources.filter((source) => allowed.has(source.adoption)).length;
}

export default function SourceArchitecturePage() {
  const reusableCount = countAdoptions("candidate", "isolated-service");
  const referenceCount = countAdoptions("reference", "retired-reference");
  const blockedCount = countAdoptions("blocked");

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
        <article><span>Aday / izole servis</span><strong>{reusableCount}</strong><small>Lisans ve teknik kapı gerekli</small></article>
        <article><span>Referans</span><strong>{referenceCount}</strong><small>Kod kopyalanmadan kullanılır</small></article>
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
                      <i className={styles[source.adoption]}>{adoptionLabels[source.adoption]}</i>
                    </div>
                    <h3>{source.repository}</h3>
                    <p>{source.use}</p>
                    <dl>
                      <div><dt>Lisans</dt><dd>{source.license}</dd></div>
                      <div><dt>Kaynak izi</dt><dd><code>{source.branch}@{source.commit}</code></dd></div>
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
        <span>İLK GERÇEK ENTEGRASYON DİLİMİ</span>
        <h2>Durum makinesi → fizyoloji → 3B hasta → sentetik görüntü</h2>
        <ol>
          <li><b>XState + xyflow:</b> klinik olay sözleşmesi ve eğitici senaryo grafiği.</li>
          <li><b>Explain Engine:</b> Web Worker içinde deterministik fizyoloji adaptörü.</li>
          <li><b>Three.js + React Three Fiber:</b> kararlarla değişen dinamik hasta sahnesi.</li>
          <li><b>Cornerstone3D:</b> sentetik ve açık lisanslı eğitim görüntülerinin incelenmesi.</li>
          <li><b>Synthea + BioGears + OpenICE:</b> ayrı süreçlerde sentetik veri, yüksek gerçeklikli fizyoloji ve cihaz test yatağı.</li>
        </ol>
        <p>Production durumu: <strong>NO-GO</strong> · Harici kod aktarımı bu kaynak denetiminden ayrı bir değişiklik ve doğrulama paketidir.</p>
      </section>
    </main>
  );
}
