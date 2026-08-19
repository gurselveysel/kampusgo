# KDPÜ Mikro Yeterlilik Yönetim Sistemi — Kontrollü Pilot

Kütahya Dumlupınar Üniversitesi için hazırlanan MYYS; gerçek HTML/CSS/JavaScript bileşenlerinden oluşan, dokuz demo rolü bulunan ve yalnız sentetik işlem verisi kullanan tıklanabilir bir karar destek mock-up'ıdır.

> **KONTROLLÜ PİLOT — Bu ortam gerçek kurumsal sistemlere bağlı değildir ve gerçek veri göndermez.**

## Güncel pilot kapsamı

- Dokuz rol için gerçekten değişen rol özeti, navigasyon, görünür veri ve işlem yetkileri
- Program önerisi, dış kazanım tanıma, koordinatörlük ön kontrolü ve Komisyon incelemesi
- Öğrenenin ücretli program başvurusundan Finans / Döner Sermaye kuyruğuna giden ödeme simülasyonu
- Finans rolünde mali ön onay, revizyon, mutabakat, bildirim ve denetim izi
- GİB/e-Arşiv ile MYS/MAYS için amaç, onay kapısı, hata ve yeniden deneme açıklamaları
- TYÇ 1–8 ve AYÇ/EQF 1–8 seviye tanımlayıcıları
- Her seviye için yeterlilik–öğrenme hedefi–içerik–ölçme/değerlendirme matrisi
- İç ve kurum dışı eğitici için doldurulabilir matris; koordinatörlük, Komisyon ve yönetici için salt-okunur inceleme
- Form doğrulama, arama, filtreleme, durum takibi ve 30 günlük pilot göstergesi
- Yapay zekânın karar vermediği karşılaştırma ve Komisyon karar desteği
- Simüle değerlendirme ve olay günlüğü; kamera, mikrofon ve biyometri yok
- Dijital yeterlilik cüzdanı ile Preview içi doğrulama
- ÖBİS, YÖKSİS, e-Devlet, GİB/e-Arşiv, MYS/MAYS, kimlik ve bildirim entegrasyon taslakları
- HTML/CSS/SVG grafikler, bildirimler ve denetim izi

## Dokuz demo rolü

| Rol | Ayırt edici pilot çalışma alanı |
| --- | --- |
| Öğrenen / Öğrenci | Katalog, eğitim başvurusu, ödeme demosu, öğrenme, değerlendirme ve cüzdan |
| Üniversite içi eğitici | Program önerisi, TYÇ/AYÇ matrisi, başvuru ve değerlendirme takibi |
| Kurum dışı eğitici | Kendi program önerisi, yeterlilik kanıtı ve TYÇ/AYÇ matrisi |
| Koordinatörlük / SEM | İdari ön kontrol, eksik kanıt ve revizyon isteği |
| Mikro Yeterlilik Komisyonu üyesi | Karşılaştırma, gerekçeli akademik pilot karar ve salt-okunur matris inceleme |
| Öğrenci İşleri yetkilisi | AKTS, kayıt uygunluğu ve aktarım taslağı |
| Bilgi İşlem yetkilisi | Entegrasyon kapıları, hata senaryoları ve denetim |
| Finans / Döner Sermaye yetkilisi | Mali ön onay, revizyon, mutabakat, fatura/hak ediş taslağı |
| Sistem yöneticisi | Rol matrisi ve teknik denetim; akademik veya mali karar yetkisi yok |

## Ödeme ve mali yönlendirme sınırı

Ödeme akışı `draft → pending_finance → approved/revision → reconciled` durumlarını, öğrenen–finans görev ayrılığını ve denetim olaylarını örnekler. Sanal POS ve Havale/EFT seçenekleri yalnız etikettir; kart, banka hesabı, T.C. kimlik numarası veya gerçek dekont alınmaz.

GİB/e-Arşiv kartı e-belge taslağının mali onaydan sonra hangi kontrollere ihtiyaç duyabileceğini; MYS/MAYS kartı bütçe, harcama, hak ediş ve mutabakat için önerilen kontrollü aktarım katmanını açıklar. İki entegrasyon da bağlı değildir; fatura, muhasebe fişi veya dış servis isteği oluşturmaz.

## TYÇ ve AYÇ/EQF matrisi

Pilot, iki çerçeveyi ayrı sekmelerde sunar:

- **TYÇ:** 1–8 düzeyinde Bilgi, Beceri ve Yetkinlik tanımlayıcıları
- **AYÇ/EQF:** 1–8 düzeyinde Knowledge, Skills, Responsibility and autonomy tanımlayıcıları; Türkçe gösterim katmanı ayrıca modellenmiştir
- **16 hazır şablon:** iki çerçeve × sekiz seviye
- **7 zorunlu matris alanı:** seviye tanımlayıcısı, öğrenme çıktısı, öğrenme düzeyi/eylem fiili, ders içeriği, ölçme-değerlendirme yöntemi, kanıt ve uyum gerekçesi
- **8 sentetik örnek satır:** TYÇ ve AYÇ/EQF için 5–8. seviyelerde aday eğitici açıklamaları

Seviye tanımlayıcıları resmî kamu kaynaklarından doğrulanan referanslardır. Matris şablonları, örnekler ve kullanıcı taslakları resmî yeterlilik veya otomatik seviye kararı değildir; kurumsal doğrulama gerekir.

## Resmî veri kapsamı ve yeniden kullanım sınırı

Kullanılan başlıca kamu kaynakları:

- [MYK — TYÇ yayınları ve seviye tanımlayıcıları](https://myk.gov.tr/tr/page/90)
- [Europass — AYÇ/EQF'nin sekiz seviyesi](https://europass.europa.eu/en/description-eight-eqf-levels)
- [Europass — Qualifications Dataset Register](https://europass.europa.eu/en/stakeholders/qdr)
- [Türkiye Yeterlilikler Veri Tabanı](https://portal.tyc.gov.tr/)

Türkiye Yeterlilikler Veri Tabanı için herkese açık, lisansı açıkça tanımlanmış bir toplu API/indirme sözleşmesi doğrulanamadığından portalın tamamı taranmamış veya kopyalanmamıştır. Bunun yerine altı doğrulanmış KDPÜ kamu üst veri kaydının kod, başlık, kurum, kredi değeri (kaynakta bulunduğunda), geçici seviye ve yerleştirme durumu kaynak bağlantısıyla tutulur. Portalda listelenmek, bir yeterliliğin TYÇ'ye resmen yerleştirildiği anlamına gelmez. Kaynak kütüğünde alım modu `manual_snapshot_only`, otomatik alım ise kapalıdır.

## Veri mimarisi

Uygulama iki katman kullanır:

1. Supabase, RLS + FORCE RLS ve yalnız `SELECT` izinleriyle resmî referansları ve sentetik pilot başlangıç görünümünü sunacak şekilde modellenmiştir.
2. Preview'daki kullanıcı işlemleri sürümlü `localStorage` çalışma alanında kalır. Başvuru, ödeme, matris ve karar durumları bu izole pilot katmanda gerçekten güncellenir; dış servise gönderilmez.

Migration dosyaları:

- [`20260819010000_myys_pilot_schema.sql`](supabase/migrations/20260819010000_myys_pilot_schema.sql)
- [`20260820010000_framework_matrix_finance_role_seed.sql`](supabase/migrations/20260820010000_framework_matrix_finance_role_seed.sql)
- [`20260820011000_framework_matrix_performance_indexes.sql`](supabase/migrations/20260820011000_framework_matrix_performance_indexes.sql)

Çerçeve ve pilot referans migration'ı canlı Supabase'e `20260819234334`, performans indeks takip migration'ı `20260819234424` sürümüyle uygulandı. Sonuç **PASS**: 14 tablo, 10 `security_invoker` katalog görünümü, 14 FORCE RLS tablo ve security advisor'da 0 bulgu. Takip migration'ı tanımlayıcı çeviri ilişkisindeki indekslenmemiş yabancı anahtar uyarısını kapattı. Performance advisor'da yalnız yeni/boş pilot şemada beklenen unused-index INFO kayıtları ile Auth connection strategy INFO kaydı kaldı.

Canlı seed sayımları sırasıyla: 2 çerçeve, 16 seviye tanımlayıcısı, 16 matris şablonu, 8 örnek satır, 4 mali yönlendirme, 9 rol özeti, 25 rol adımı, 2 veri kaynağı, 6 KDPÜ üst veri kaydı, 8 çeviri, 2 matris taslağı, 6 taslak satırı, 1 ödeme talebi ve 2 ödeme olayı.

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

- Domain ve rol sözleşmeleri: **22/22 başarılı**
- Zorunlu dosya / production güvenlik doğrulaması: **17/17 başarılı**
- Canlı Supabase migration, RLS/grant ve advisor doğrulaması: **PASS**
- Önceki temel sürüm 9 rol × 4 viewport tarayıcı matrisi: **36/36 başarılı** ([GitHub Actions run #7](https://github.com/gurselveysel/kampusgo/actions/runs/32268491557))
- Bu ödeme/matris revizyonunun son Preview tarayıcı QA, asset ve alias smoke kontrolü: **uygulama sonrası doğrulanacak**

## Vercel Preview

- Public Preview adresi: <https://kampusgo.uzemgo.com/pilot.html>
- Kök rota: `/` → `/pilot.html`
- Bu revizyonun son Vercel deployment kimliği, `target: null` teyidi ve public smoke sonucu: **uygulama sonrası doğrulanacak**

`vercel.json`, kamera, mikrofon, konum ve ödeme tarayıcı yeteneklerini kapatan güvenlik başlıklarını içerir. Production terfisi yapılmamalıdır.

## Görsel varlıklar

ChatGPT Images ile aynı sanat yönetiminde dört özgün illüstrasyon kullanılır: MYYS ekosistemi, Komisyon karar masası, dijital yeterlilik/güven zinciri ve kontrollü entegrasyon kapıları. KDPÜ logosu ile GO simgesi yüklenen özgün dosyalardan ayrı `<img>` bileşenleri olarak gösterilir; arayüz kontrolleri görsellere gömülü değildir.

## Belgeler

- [Kaynak–gereksinim izlenebilirliği](docs/source-traceability.md)
- [Test raporu](docs/test-report.md)
- [Tek teslim raporu](docs/delivery-report.md)

## Production NO-GO — kesin karar

Gerçek öğrenci/personel verisi, ödeme, e-fatura, kurumsal kimlik, kamera/mikrofon kaydı, biyometri, SMS/e-posta veya canlı ÖBİS/YÖKSİS/e-Devlet/GİB/MYS/MAYS çağrısı yoktur. Production deployment, production branch yayını ve canlı alan adına production hedefi bağlanması bu çalışma kapsamında kesinlikle yapılmaz.
