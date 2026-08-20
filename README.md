# KDPÜ Mikro Yeterlilik Yönetim Sistemi — Kontrollü Pilot

Kütahya Dumlupınar Üniversitesi için hazırlanan MYYS; gerçek HTML/CSS/JavaScript bileşenlerinden oluşan, dokuz demo rolü bulunan ve yalnız sentetik işlem verisi kullanan tıklanabilir bir karar destek mock-up'ıdır.

> **KONTROLLÜ PİLOT — Bu ortam gerçek kurumsal sistemlere bağlı değildir ve gerçek veri göndermez.**

## Güncel pilot kapsamı

- Dokuz rol için gerçekten değişen rol özeti, navigasyon, görünür veri ve işlem yetkileri
- Program önerisi, dış kazanım tanıma, koordinatörlük ön kontrolü ve Komisyon incelemesi
- Öğrenenin ücretli program başvurusundan Finans / Döner Sermaye kuyruğuna giden ödeme simülasyonu
- Finans rolünde mali ön onay, revizyon, mutabakat, bildirim ve denetim izi
- GİB/e-Arşiv ile MYS/MAYS için amaç, onay kapısı, hata ve yeniden deneme açıklamaları
- TYÇ 1–8, AYÇ/EQF 1–8 ve TYYÇ 5–8 öneri katmanları
- Her seviye için yeterlilik–öğrenme hedefi–içerik–ölçme/değerlendirme matrisi
- İç ve kurum dışı eğitici için doldurulabilir matris; koordinatörlük, Komisyon ve yönetici için salt-okunur inceleme
- Form doğrulama, arama, filtreleme, durum takibi ve 30 günlük pilot göstergesi
- Yapay zekânın karar vermediği karşılaştırma ve Komisyon karar desteği
- Simüle değerlendirme ve olay günlüğü; kamera, mikrofon ve biyometri yok
- Dijital yeterlilik cüzdanı ile Preview içi doğrulama
- ÖBİS, YÖKSİS, e-Devlet, GİB/e-Arşiv, MYS/MAYS, kimlik ve bildirim entegrasyon taslakları
- DPÜ kurumsal otomasyonları için kaynak izli **32 iç sistem**, 32 veri eşlemesi, 32 dry-run senaryosu ve 32 sentetik denetim olayı
- DPÜ iç kataloğundan ayrı tutulan **5 dış pilot kapısı**: GİB/e-Arşiv, mali MYS/MAYS, YÖKSİS/TÖMERSİS, e-Devlet ve e-posta/SMS
- Tier 1–3 teknik entegrasyon olgunluğu ile `core` / `supporting` / `adjacent` MYYS öneminin bağımsız sınıflandırılması
- HTML/CSS/SVG grafikler, bildirimler ve denetim izi

## Dokuz demo rolü

| Rol | Ayırt edici pilot çalışma alanı |
| --- | --- |
| Öğrenen / Öğrenci | Katalog, eğitim başvurusu, ödeme demosu, öğrenme, değerlendirme ve cüzdan |
| Üniversite içi eğitici | Program önerisi, TYÇ/AYÇ/TYYÇ matrisi, başvuru ve değerlendirme takibi |
| Kurum dışı eğitici | Kendi program önerisi, yeterlilik kanıtı ve TYÇ/AYÇ/TYYÇ matrisi |
| Koordinatörlük / SEM | İdari ön kontrol, eksik kanıt ve revizyon isteği |
| Mikro Yeterlilik Komisyonu üyesi | Karşılaştırma, gerekçeli akademik pilot karar ve salt-okunur matris inceleme |
| Öğrenci İşleri yetkilisi | AKTS, kayıt uygunluğu ve aktarım taslağı |
| Bilgi İşlem yetkilisi | Entegrasyon kapıları, hata senaryoları ve denetim |
| Finans / Döner Sermaye yetkilisi | Mali ön onay, revizyon, mutabakat, fatura/hak ediş taslağı |
| Sistem yöneticisi | Rol matrisi ve teknik denetim; akademik veya mali karar yetkisi yok |

## Ödeme ve mali yönlendirme sınırı

Ödeme akışı `draft → pending_finance → approved/revision → reconciled` durumlarını, öğrenen–finans görev ayrılığını ve denetim olaylarını örnekler. Sanal POS ve Havale/EFT seçenekleri yalnız etikettir; kart, banka hesabı, T.C. kimlik numarası veya gerçek dekont alınmaz.

GİB/e-Arşiv kartı e-belge taslağının mali onaydan sonra hangi kontrollere ihtiyaç duyabileceğini; MYS/MAYS kartı bütçe, harcama, hak ediş ve mutabakat için önerilen kontrollü aktarım katmanını açıklar. İki entegrasyon da bağlı değildir; fatura, muhasebe fişi veya dış servis isteği oluşturmaz.

## DPÜ kurumsal otomasyon mimarisi

Entegrasyon Merkezi, resmî DPÜ kamu sayfalarında doğrulanabilen sistem ve hizmetleri **aday keşif kaydı** olarak gösterir. Kamuya açık bir sayfanın bulunması API, SSO, servis sözleşmesi veya canlı veri yetkisi bulunduğu anlamına gelmez. Her kayıtta kaynak URL'si, doğrulama temeli, muhtemel veri sahibi, veri sınıfı, onay kapısı, hata/yeniden deneme ve denetim izi ayrı tutulur.

Katalog; 32 DPÜ iç sistem kaydı, her sistem için bir veri eşlemesi, bir kontrollü dry-run senaryosu ve bir sentetik denetim olayı içerir. Bunlar çalıştırılmış canlı entegrasyonlar değil; kaynak izli tasarım ve yönetişim kayıtlarıdır. `realDataEnabled`, `realDataSent`, `liveRequestMade` ve `productionAllowed` güvenlik bayraklarının tamamı sıfır/`false` değerindedir.

- **Tier 1:** Kamuya açık, salt-okunur referans veya katalog adayı
- **Tier 2:** Kurumsal kimlik, durum ya da kontrollü veri servisi adayı
- **Tier 3:** İşlem, resmî belge, imza veya mali handoff adayı
- **MYYS önemi:** `core`, `supporting` ve `adjacent` etiketi Tier'dan bağımsızdır

Ana veri sınırı: öğrenci ve kazanılmış AKTS OBS'de; planlanan müfredat, ders çıktıları ve AKTS Bologna Bilgi Paketi'nde; eğitim teslimi ve değerlendirme kanıtı ÖYS'de; resmî karar EBYS'de; kalite/risk/PUKÖ BKYS'de; tahsilat ve hak ediş mali birimlerde kalır. MYYS bu sistemleri kopyalamaz, yalnız kurumsal olarak onaylanmış asgari veri sözleşmelerini orkestre edecek şekilde tasarlanır.

BKYS içindeki **Memnuniyet Yönetim Sistemi (kalite MYS)** ile mali süreçlerdeki **MYS/MAYS** farklı sistemlerdir. GİB/e-Arşiv, mali MYS/MAYS, YÖKSİS/TÖMERSİS, e-Devlet ve dış bildirim kanalları DPÜ iç sistem kataloğundan ayrı, bağlı-olmayan dış kapılar olarak gösterilir.

## TYÇ, AYÇ/EQF ve TYYÇ matrisi

Pilot, üç ayrı öneri katmanını ayrı sekmelerde sunar:

- **TYÇ:** 1–8 düzeyinde Bilgi, Beceri ve Yetkinlik tanımlayıcıları
- **AYÇ/EQF:** 1–8 düzeyinde Knowledge, Skills, Responsibility and autonomy tanımlayıcıları; Türkçe gösterim katmanı ayrıca modellenmiştir
- **TYYÇ:** 5–8 düzeyinde YÖK/MYK'nın altı yükseköğretim yeterlilik türü form sicili; boyut metinleri formun yerine geçmeyen `advisory_summary_not_verbatim` operational özetlerdir
- **20 hazır şablon:** TYÇ 8 + AYÇ/EQF 8 + TYYÇ 4 seviye
- **7 zorunlu matris alanı:** seviye tanımlayıcısı, öğrenme çıktısı, öğrenme düzeyi/eylem fiili, ders içeriği, ölçme-değerlendirme yöntemi, kanıt ve uyum gerekçesi
- **12 sentetik örnek satır:** üç katman için 5–8. seviyelerde aday eğitici açıklamaları

Seviye tanımlayıcıları resmî kamu kaynaklarından doğrulanan referanslardır. Matris şablonları, örnekler ve kullanıcı taslakları resmî yeterlilik veya otomatik seviye kararı değildir; kurumsal doğrulama gerekir.

### Akıllı öğrenme çıktısı eşleme pilotu

Program önerisi formu, her satırdaki Türkçe öğrenme çıktısını ayrı değerlendirir. Ölçülebilir eylemden çıkarılan kanonik boyut analizi ortak sinyal kümesini kullanabilir; TYÇ, AYÇ/EQF ve TYYÇ seviyeleri, tanımlayıcı/operational özetleri ve eşleşme puanları ayrı hesaplanır ve eşitliğe zorlanmaz:

- **TYÇ ve AYÇ/EQF:** Her çıktı için ayrı 1–8 seviye ve Bilgi/Beceri/Yetkinlik–Sorumluluk ve Özerklik boyutu
- **TYYÇ:** Her çıktı için ayrı 5–8 önerilen pedagojik referans düzeyi, yeterlilik türü adayı, alternatifler ve eksik kanıt uyarısı; resmî yerleştirme/eşdeğerlik/akreditasyon/logo hakkı iddiası yoktur
- **Açıklanabilir puan:** Eşleşen ölçülebilir fiil, karmaşıklık ve özerklik sinyalleri; 0–100 pilot eşleşme puanı; resmî tanımlayıcı ve gerekçe
- **Tasarım desteği:** İçerik, ölçme-değerlendirme, rubrik/kanıt ve gözlenebilir eylem önerileri
- **Program özeti:** Çoklu çıktıda çerçeve seviyesi, boyut kapsaması, tutarlılık uyarısı ve geçici TYYÇ/Bologna döngüsü açıklaması
- **İnsan kontrolü:** Öneri hiçbir alanı sessizce uygulamaz. İç veya kurum dışı eğitici öneriyi seçer ya da gerekçeli manuel seviye/boyut düzeltmesi yapar.
- **İzlenebilir kalıcılık:** Uygulama veri sözleşmesi v15'tir. Üç katmandaki tam öneri raporu, kaynak/referans sürümleri, seçim bağlamı ve bütünlük hash'iyle değişmez snapshot olarak `smartAlignments` pilot çalışma alanında saklanır. Tarihsel kanıt güncel motorla yeniden hesaplanmaz; çıktı metni veya sırası değişirse eski seçimler yeniden uygulanmaz. Supabase şeması kayıtları directive program/version omurgasına ve ilişkisel constructive-alignment zincirine bağlar.
- **Kalite kapısı:** Boş, ölçülemeyen, 40 adedi veya çıktı başına 600 karakteri aşan ya da analiz hatasına düşen öğrenme çıktıları taslak, program veya başvuru mutasyonu oluşturmaz.
- **Rol sınırı:** Koordinatörlük ve Komisyon öneri/matris kaydını salt-okunur inceler. Komisyon kararı, öneriyi değiştirmeyen ayrı bir insan kurul kaydıdır.

Kısa veya ölçülemeyen metinler kesin eşleme gibi sunulmaz; düşük güvenle işaretlenir ve çıktıyı iyileştirme yönlendirmesi gösterilir. Motor deterministik bir pilot yardımcıdır; resmî TYÇ/TYYÇ yerleştirmesi, AYÇ eşdeğerliği, akreditasyon, logo hakkı veya nihai akademik karar üretmez.

## Resmî veri kapsamı ve yeniden kullanım sınırı

Kullanılan başlıca kamu kaynakları:

- [MYK — TYÇ yayınları ve seviye tanımlayıcıları](https://myk.gov.tr/tr/page/90)
- [Europass — AYÇ/EQF'nin sekiz seviyesi](https://europass.europa.eu/en/description-eight-eqf-levels)
- [YÖK — yükseköğretim yeterlilik türleri](https://uluslararasi.yok.gov.tr/Sayfalar/avrupa-yuksekogretim-alani-ile-uyum-projesi/yeterlikler-cercevesi/yuksekogretim-yeterlilik-turleri.aspx)
- [MYK — TYYÇ yeterlilik türü form sicili](https://www.myk.gov.tr/tr/page/174)
- [Europass — Qualifications Dataset Register](https://europass.europa.eu/en/stakeholders/qdr)
- [Türkiye Yeterlilikler Veri Tabanı](https://portal.tyc.gov.tr/)

Türkiye Yeterlilikler Veri Tabanı için herkese açık, lisansı açıkça tanımlanmış bir toplu API/indirme sözleşmesi doğrulanamadığından portalın tamamı taranmamış veya kopyalanmamıştır. Bunun yerine altı doğrulanmış KDPÜ kamu üst veri kaydının kod, başlık, kurum, kredi değeri (kaynakta bulunduğunda), geçici seviye ve yerleştirme durumu kaynak bağlantısıyla tutulur. Portalda listelenmek, bir yeterliliğin TYÇ'ye resmen yerleştirildiği anlamına gelmez. Kaynak kütüğünde alım modu `manual_snapshot_only`, otomatik alım ise kapalıdır.

DPÜ otomasyon araştırması da kamuya açık resmî sayfaların kaynak iziyle sınırlıdır. Giriş gerektiren sayfalar, kişi kayıtları ve tam portal içerikleri kazınmamış; gerçek kişisel veri, parola/token veya canlı API verisi çekilmemiştir. Katalogdaki bir kayıt, sistemin/amacın resmî kamu sayfasında görüldüğünü belirtir; çalışan API, SSO ya da yazma yetkisi iddiası değildir.

## Veri mimarisi

Uygulama iki katman kullanır:

1. Supabase, RLS + FORCE RLS ile resmî referansları ve sentetik pilot başlangıç görünümünü sunacak şekilde modellenmiştir. Anonim istemci yalnız iki kamu kaynak tablosunun iki `security_invoker` görünümünü okur; korumalı görünümleri çağırmaz ve hiçbir tabloya yazamaz. Kimliği doğrulanmış kapsamlı okumalar JWT rol/birim/karar kapsamına bağlıdır.
2. Preview'daki kullanıcı işlemleri sürümlü `localStorage` çalışma alanında kalır. Başvuru, ödeme, matris ve karar durumları bu izole pilot katmanda gerçekten güncellenir; dış servise gönderilmez.

Migration dosyaları:

- [`20260819010000_myys_pilot_schema.sql`](supabase/migrations/20260819010000_myys_pilot_schema.sql)
- [`20260820010000_framework_matrix_finance_role_seed.sql`](supabase/migrations/20260820010000_framework_matrix_finance_role_seed.sql)
- [`20260820011000_framework_matrix_performance_indexes.sql`](supabase/migrations/20260820011000_framework_matrix_performance_indexes.sql)
- [`20260820012000_dpu_institutional_integration_catalog.sql`](supabase/migrations/20260820012000_dpu_institutional_integration_catalog.sql)
- [`20260820013000_dpu_institutional_integration_performance_indexes.sql`](supabase/migrations/20260820013000_dpu_institutional_integration_performance_indexes.sql)
- [`20260820014000_dpu_institutional_source_provenance.sql`](supabase/migrations/20260820014000_dpu_institutional_source_provenance.sql)
- [`20260820020000_smart_qualification_suggestion_engine.sql`](supabase/migrations/20260820020000_smart_qualification_suggestion_engine.sql) — akıllı eşleme pilot şeması; Supabase sürümü `20260820062225`
- [`20260820021000_smart_qualification_performance_indexes.sql`](supabase/migrations/20260820021000_smart_qualification_performance_indexes.sql) — bileşik öneri-provenans yabancı anahtarı indeksi; Supabase sürümü `20260820062551`
- [`20260820030000_directive_alignment_pilot_schema.sql`](supabase/migrations/20260820030000_directive_alignment_pilot_schema.sql) — yönerge kontrollü pilot program/version omurgası; canlı sürüm `20260820113725`
- [`20260820031000_directive_alignment_performance_indexes.sql`](supabase/migrations/20260820031000_directive_alignment_performance_indexes.sql) — yönerge performans indeksleri; canlı sürüm `20260820114057`
- [`20260820032000_tyyc_smart_alignment_program_spine.sql`](supabase/migrations/20260820032000_tyyc_smart_alignment_program_spine.sql) — ayrı TYYÇ katmanı, smart→directive composite FK ve constructive-alignment zinciri; canlı sürüm `20260820123559`
- [`20260820033000_directive_reference_access_hardening.sql`](supabase/migrations/20260820033000_directive_reference_access_hardening.sql) — kaynak sicili ve JWT rol/birim/kapsam RLS sertleştirmesi; canlı sürüm `20260820123602`
- [`20260820034000_tyyc_spine_integrity_performance.sql`](supabase/migrations/20260820034000_tyyc_spine_integrity_performance.sql) — aynı omurga bütünlüğü ve yabancı anahtar performans indeksleri; canlı sürüm `20260820124546`

Beş takip migration'ı canlı projede sırasıyla `20260820113725` (30000), `20260820114057` (31000), `20260820123559` (32000), `20260820123602` (33000) ve `20260820124546` (34000) sürümleriyle uygulanmıştır; toplam canlı migration sayısı **15**'tir. Sonuç **PASS**: yönerge kapsamındaki 34 tabloda FORCE RLS, 15 `security_invoker` yönerge görünümü, S01–S27 olarak 27 resmî kaynak ve 33 madde–kaynak bağlantısı, dokuz rol için tam kapsamlı DTO sözleşmesi vardır. Anonim rolün yüzeyi tam olarak iki kaynak tablosu + iki kamu görünümüdür; korumalı görünüm isteği ve anonim yazma yetkisi yoktur. Security advisor sonucu **0**, indekslenmemiş yabancı anahtar sayısı **0**; performance advisor'da yalnız boş pilot için beklenen unused-index ve Auth bağlantı stratejisi sınıfındaki **96 INFO** kaydı bulunur.

Canlı yönerge omurgasının sayımları 27 resmî kaynak, 33 madde–kaynak bağlantısı ve dokuz rol kapsam DTO'sudur. TYÇ, AYÇ/EQF ve TYYÇ referans/öneri katmanları kullanıcı işlem verisinden ayrı tutulur.

DPÜ entegrasyon katmanı ayrıca 32 sistem, 32 eşleme, 32 dry-run senaryosu ve 32 sentetik denetim olayı içerir. Dört yeni tabloda FORCE RLS, dört yeni görünümde `security_invoker` aktiftir. Hiçbir kayıtta gerçek kişi verisi, canlı API isteği, gerçek aktarım veya production işlemi yoktur.

## Yerel çalıştırma ve test

Gereksinim: Node.js 22 veya üzeri.

```bash
npm install
npm run dev
```

Ardından `http://localhost:3000` adresini açın. Next.js App Router kök rotası `/pilot.html` rotasına yönlendirir. Bağımlılıksız statik geliştirme sunucusu `npm run dev:static` ile `http://localhost:4173` üzerinde açılabilir.

```bash
npm run build
npm run build:static
npm test
```

19–20 Ağustos 2026 UTC yerel doğrulaması:

- Domain, rol, entegrasyon ve yönerge UI sözleşmeleri: **36/36 başarılı**
- DPÜ entegrasyon veri sözleşmesi: **32/32/32/32 başarılı**
- Akıllı TYÇ/AYÇ/TYYÇ eşleme ve değişmez snapshot sözleşmesi: **12/12 başarılı**
- Zorunlu dosya / production güvenlik doğrulaması: **47/47 başarılı**
- Canlı Supabase migration, RLS/grant ve advisor doğrulaması: **PASS**
- Güncel v15 yayını 9 rol × 4 viewport tarayıcı regresyonu: **PASS** — 36 rol/viewport bileşimi, 0 hata ([GitHub Actions run `32375917382`](https://github.com/gurselveysel/kampusgo/actions/runs/32375917382), job `96447182122`, artifact `9409045414`; 3.755.151 bayt, SHA-256 `3cd1ee779d14fa68696f4c7885ada3a4a1a04cb915e957cd51e779fc153f3b8c`)
- Doğrulanan exact Preview: <https://kdpu-myys-mockup-roliiwx2o-info-64116029s-projects.vercel.app/pilot.html> — `dpl_2zaxrgj1ZUG3BjaVpo6AJyPgn8pX`, READY, `target: null`, alias listesi boş
- GitHub kanıtı: [v15 kod/QA düzeltmesi `1dd8dd6`](https://github.com/gurselveysel/kampusgo/commit/1dd8dd699992cf06463d9feeff522cb8a1a3d1cb) ve [final iş akışı `b966813`](https://github.com/gurselveysel/kampusgo/commit/b966813d1d6fb154eea209ff70e28c5b6a6b43ba)

## Vercel Preview

- Exact READY Preview: <https://kdpu-myys-mockup-roliiwx2o-info-64116029s-projects.vercel.app/pilot.html>
- Kök rota: `/` → `/pilot.html`
- Deployment `dpl_2zaxrgj1ZUG3BjaVpo6AJyPgn8pX`: **READY Preview**, `target: null`, alias `[]`; HTML, JS, CSS, logolar ve WebP asset smoke kontrolü **PASS**
- <https://kampusgo.uzemgo.com/pilot.html> özel aliası bu çalışmada güncellenmemiştir ve final exact Preview olarak gösterilmemelidir.

`vercel.json`, kamera, mikrofon, konum ve ödeme tarayıcı yeteneklerini kapatan güvenlik başlıklarını içerir. Production terfisi yapılmamalıdır.

## Görsel varlıklar

ChatGPT Images ile aynı sanat yönetiminde dört özgün illüstrasyon kullanılır: MYYS ekosistemi, Komisyon karar masası, dijital yeterlilik/güven zinciri ve kontrollü entegrasyon kapıları. KDPÜ logosu ile GO simgesi yüklenen özgün dosyalardan ayrı `<img>` bileşenleri olarak gösterilir; arayüz kontrolleri görsellere gömülü değildir.

## Belgeler

- [Kaynak–gereksinim izlenebilirliği](docs/source-traceability.md)
- [Test raporu](docs/test-report.md)
- [Tek teslim raporu](docs/delivery-report.md)
- [Akıllı eşleme kabul sözleşmesi](docs/smart-alignment-acceptance.md)

## Production NO-GO — kesin karar

Gerçek öğrenci/personel verisi, ödeme, e-fatura, kurumsal kimlik, kamera/mikrofon kaydı, biyometri, SMS/e-posta veya canlı ÖBİS/YÖKSİS/e-Devlet/GİB/MYS/MAYS çağrısı yoktur. Production deployment, production branch yayını ve canlı alan adına production hedefi bağlanması bu çalışma kapsamında kesinlikle yapılmaz.
