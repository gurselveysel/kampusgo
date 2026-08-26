"use client";

import { useEffect, useState } from "react";
import styles from "./gorsel-akademi.module.css";

const scenes = [
  {
    eyebrow: "1 · İlk öğrenme",
    title: "Bilgi, kullanılmadığında erişilebilirliğini kaybedebilir",
    narration:
      "Öğrenci yeni bir kavramla karşılaştığında güçlü görünen öğrenme izi, tekrar ve uygulama olmadan zaman içinde silikleşebilir.",
    detail:
      "Grafik, gerçek bir öğrenci ölçümü değil; anlatımı kolaylaştıran temsili bir öğrenme modelidir.",
  },
  {
    eyebrow: "2 · Zamanlanmış tekrar",
    title: "Doğru anda yapılan tekrar öğrenme izini yeniden güçlendirir",
    narration:
      "İlk tekrar, bilgi tamamen unutulmadan yapıldığında öğrenci aynı içeriğe daha kısa sürede yeniden hâkim olabilir.",
    detail:
      "KampüsGO, tekrar zamanını program takvimi ve öğrencinin performans sinyalleriyle ilişkilendirebilir.",
  },
  {
    eyebrow: "3 · Aktif hatırlama",
    title: "Yeniden okumak yerine bilgiyi zihinden çağırmak",
    narration:
      "Kısa bir soru, vaka veya uygulama görevi öğrencinin bilgiyi yalnızca görmesini değil, geri çağırmasını ve kullanmasını sağlar.",
    detail:
      "Bu örnekte doğru yanıt, ikinci ve üçüncü tekrar aralıklarının genişlemesini tetikleyen bir pilot sinyal olarak kullanılıyor.",
  },
  {
    eyebrow: "4 · Kişiselleştirilmiş plan",
    title: "Bir sonraki çalışma zamanı öğrenciye göre önerilir",
    narration:
      "Sistem, son hatırlama başarısını ve görevin güçlüğünü değerlendirerek yeni bir çalışma önerisi üretir; nihai plan eğitici veya öğrenci tarafından onaylanır.",
    detail:
      "Bu sayfa yalnızca kullanıcı deneyimi örneğidir; gerçek yapay zekâ, seslendirme veya ölçme motoru çalıştırmaz.",
  },
] as const;

const pipeline = [
  ["Kaynak", "Ders notu veya makale"],
  ["Analiz", "Önemli kavramları seç"],
  ["Hikâye", "4 kısa sahne oluştur"],
  ["Görsel", "Animasyon ve anlatım"],
  ["Onay", "Eğitici kontrolü"],
] as const;

export default function VisualAcademyDemoPage() {
  const [current, setCurrent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!isPlaying) return;

    const timer = window.setInterval(() => {
      setCurrent((previous) => {
        if (previous === scenes.length - 1) {
          setIsPlaying(false);
          return previous;
        }
        return previous + 1;
      });
    }, 4300);

    return () => window.clearInterval(timer);
  }, [isPlaying]);

  const scene = scenes[current];
  const progress = ((current + 1) / scenes.length) * 100;

  function restart() {
    setCurrent(0);
    setIsPlaying(true);
  }

  function togglePlayback() {
    if (current === scenes.length - 1 && !isPlaying) {
      restart();
      return;
    }
    setIsPlaying((value) => !value);
  }

  return (
    <main className={styles.page}>
      <div className={styles.ambientOne} aria-hidden="true" />
      <div className={styles.ambientTwo} aria-hidden="true" />

      <header className={styles.topbar}>
        <a className={styles.brand} href="/pilot.html" aria-label="KampüsGO kontrollü pilota dön">
          <span className={styles.brandMark} aria-hidden="true">GO</span>
          <span>
            <strong>KampüsGO</strong>
            <small>Görsel Akademi</small>
          </span>
        </a>

        <div className={styles.headerMeta}>
          <span className={styles.statusDot} aria-hidden="true" />
          Bağımsız UI prototipi
        </div>
      </header>

      <div className={styles.pilotBanner} role="status">
        <strong>KONTROLLÜ PİLOT</strong>
        <span>Gerçek yapay zekâ, seslendirme, öğrenci verisi veya Manim render servisi kullanılmaz.</span>
      </div>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.kicker}>Yapay zekâ destekli görsel öğrenme — örnek deneyim</span>
          <h1>Bir eğitim metnini dört sahnelik görsel hikâyeye dönüştür.</h1>
          <p>
            Bu prototip, KampüsGO’ya eklenebilecek “Görsel Akademi” modülünün tek bir örneğini gösterir.
            Konu: <strong>aralıklı tekrar ve aktif hatırlama</strong>.
          </p>

          <div className={styles.heroActions}>
            <button className={styles.primaryButton} type="button" onClick={togglePlayback}>
              <span className={styles.playIcon} aria-hidden="true">{isPlaying ? "Ⅱ" : "▶"}</span>
              {isPlaying ? "Duraklat" : current === scenes.length - 1 ? "Baştan oynat" : "Örneği oynat"}
            </button>
            <a className={styles.secondaryButton} href="#uretim-hatti">Üretim hattını gör</a>
          </div>

          <div className={styles.sourceCard}>
            <div>
              <span className={styles.sourceLabel}>Örnek kaynak metin</span>
              <h2>Aralıklı tekrar neden işe yarar?</h2>
            </div>
            <p>
              Yeni bilgi, tek seferde sunulmak yerine uygun aralıklarla yeniden çağrıldığında öğrenme süreci
              daha görünür ve yönetilebilir hâle gelir. Tekrarın zamanı kadar, öğrencinin bilgiyi aktif olarak
              kullanması da önemlidir.
            </p>
            <div className={styles.tags} aria-label="Kaynak etiketleri">
              <span>Öğrenme bilimi</span>
              <span>4 sahne</span>
              <span>~45 saniye</span>
            </div>
          </div>
        </div>

        <div className={styles.demoShell}>
          <div className={styles.demoHeader}>
            <div>
              <span>Görsel hikâye ön izlemesi</span>
              <strong>{current + 1} / {scenes.length}</strong>
            </div>
            <button className={styles.restartButton} type="button" onClick={restart}>Yeniden başlat</button>
          </div>

          <div className={styles.progressTrack} aria-label={`İlerleme yüzde ${Math.round(progress)}`}>
            <span style={{ width: `${progress}%` }} />
          </div>

          <div className={styles.visualStage}>
            <svg
              className={styles.memoryChart}
              viewBox="0 0 720 390"
              role="img"
              aria-labelledby="memory-chart-title memory-chart-description"
            >
              <title id="memory-chart-title">Aralıklı tekrar temsili öğrenme grafiği</title>
              <desc id="memory-chart-description">
                İlk öğrenmeden sonra azalan hatırlama eğrisi, zamanlanmış tekrarlar ve aktif hatırlama görevleriyle
                yeniden yükseliyor.
              </desc>

              <defs>
                <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#b52b32" stopOpacity="0.24" />
                  <stop offset="100%" stopColor="#b52b32" stopOpacity="0" />
                </linearGradient>
                <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <g className={styles.grid} aria-hidden="true">
                <line x1="78" y1="54" x2="78" y2="322" />
                <line x1="78" y1="322" x2="662" y2="322" />
                <line x1="78" y1="120" x2="662" y2="120" />
                <line x1="78" y1="188" x2="662" y2="188" />
                <line x1="78" y1="256" x2="662" y2="256" />
              </g>

              <text className={styles.axisLabel} x="28" y="68">Yüksek</text>
              <text className={styles.axisLabel} x="32" y="316">Düşük</text>
              <text className={styles.axisLabel} x="603" y="354">Zaman</text>
              <text className={styles.verticalLabel} x="22" y="214" transform="rotate(-90 22 214)">
                Hatırlama erişilebilirliği
              </text>

              <path
                className={styles.areaPath}
                d="M78 78 C150 111 182 181 230 231 C278 279 355 298 662 310 L662 322 L78 322 Z"
                fill="url(#areaFill)"
              />
              <path
                className={styles.baseCurve}
                d="M78 78 C150 111 182 181 230 231 C278 279 355 298 662 310"
              />

              <g className={`${styles.reviewLayer} ${current >= 1 ? styles.visible : ""}`}>
                <line className={styles.reviewGuide} x1="232" y1="78" x2="232" y2="322" />
                <path className={styles.reviewCurveOne} d="M232 231 C246 150 259 95 278 82 C340 116 376 178 418 229" />
                <circle className={styles.reviewPoint} cx="232" cy="231" r="8" />
                <circle className={styles.boostPoint} cx="278" cy="82" r="9" filter="url(#softGlow)" />
                <g className={styles.reviewBadge} transform="translate(176 42)">
                  <rect width="112" height="34" rx="17" />
                  <text x="56" y="22" textAnchor="middle">1. tekrar</text>
                </g>
              </g>

              <g className={`${styles.reviewLayer} ${current >= 2 ? styles.visible : ""}`}>
                <line className={styles.reviewGuide} x1="418" y1="78" x2="418" y2="322" />
                <path className={styles.reviewCurveTwo} d="M418 229 C435 143 453 94 474 80 C526 111 568 169 610 218" />
                <circle className={styles.reviewPoint} cx="418" cy="229" r="8" />
                <circle className={styles.boostPointAlt} cx="474" cy="80" r="9" filter="url(#softGlow)" />
                <g className={styles.reviewBadgeAlt} transform="translate(357 42)">
                  <rect width="122" height="34" rx="17" />
                  <text x="61" y="22" textAnchor="middle">Aktif çağırma</text>
                </g>
              </g>

              <g className={`${styles.scheduleLayer} ${current >= 3 ? styles.visible : ""}`}>
                <rect x="486" y="218" width="176" height="84" rx="18" />
                <text className={styles.scheduleSmall} x="504" y="244">SONRAKİ ÖNERİ</text>
                <text className={styles.scheduleLarge} x="504" y="274">4 gün sonra</text>
                <text className={styles.scheduleNote} x="504" y="292">Eğitici onayı bekleniyor</text>
              </g>
            </svg>

            <div className={`${styles.quizCard} ${current === 2 ? styles.quizVisible : ""}`} aria-hidden={current !== 2}>
              <span>Aktif hatırlama sorusu</span>
              <strong>Tekrarın yalnızca zamanı mı, yoksa yöntemi de önemli midir?</strong>
              <div>
                <span className={styles.wrongOption}>Yalnızca zamanı</span>
                <span className={styles.correctOption}>Zamanı ve yöntemi</span>
              </div>
            </div>
          </div>

          <article className={styles.sceneCopy} aria-live="polite">
            <span>{scene.eyebrow}</span>
            <h2>{scene.title}</h2>
            <p>{scene.narration}</p>
            <small>{scene.detail}</small>
          </article>

          <div className={styles.sceneTabs} role="tablist" aria-label="Görsel hikâye sahneleri">
            {scenes.map((item, index) => (
              <button
                key={item.eyebrow}
                className={index === current ? styles.activeTab : ""}
                type="button"
                role="tab"
                aria-selected={index === current}
                onClick={() => {
                  setCurrent(index);
                  setIsPlaying(false);
                }}
              >
                <span>{index + 1}</span>
                <small>{item.eyebrow.split(" · ")[1]}</small>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.pipelineSection} id="uretim-hatti">
        <div className={styles.sectionHeading}>
          <span>Temiz oda yaklaşımı</span>
          <h2>Kendi mimarimizle kurulacak örnek üretim hattı</h2>
          <p>
            Kaynak kodu kopyalamadan, fikri KampüsGO’nun yetki, onay ve denetim modeliyle bağımsız biçimde uygularız.
          </p>
        </div>

        <div className={styles.pipelineGrid}>
          {pipeline.map(([title, description], index) => (
            <article key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{title}</h3>
              <p>{description}</p>
              {index < pipeline.length - 1 ? <i aria-hidden="true">→</i> : null}
            </article>
          ))}
        </div>

        <div className={styles.analysisGrid}>
          <article>
            <span>Kavram</span>
            <strong>Aralıklı tekrar</strong>
            <small>Öğrenme süreci</small>
          </article>
          <article>
            <span>Görsel türü</span>
            <strong>Zaman serisi</strong>
            <small>SVG / web animasyonu</small>
          </article>
          <article>
            <span>Anlatım</span>
            <strong>4 kısa sahne</strong>
            <small>Türkçe metin taslağı</small>
          </article>
          <article>
            <span>Yayın kapısı</span>
            <strong>Eğitici onayı</strong>
            <small>Otomatik yayın yok</small>
          </article>
        </div>
      </section>

      <footer className={styles.footer}>
        <div>
          <strong>KampüsGO — Görsel Akademi prototipi</strong>
          <span>Gürsel Online Eğitim ve Bilgi Teknolojileri A.Ş.</span>
        </div>
        <a href="/pilot.html">Kontrollü pilota dön</a>
      </footer>
    </main>
  );
}
