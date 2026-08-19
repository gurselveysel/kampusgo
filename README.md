# KDPÜ Mikro Yeterlilik Yönetim Sistemi — Kontrollü Pilot

Kütahya Dumlupınar Üniversitesi için hazırlanan MYYS, gerçek HTML/CSS/JavaScript bileşenlerinden oluşan tıklanabilir bir karar destek mock-up'ıdır. Uygulama yalnızca sentetik verilerle çalışır ve gerçek kurumsal sistemlere veri göndermez.

> **KONTROLLÜ PİLOT — Bu ortam gerçek kurumsal sistemlere bağlı değildir ve gerçek veri göndermez.**

## Çalışma kapsamı

- Dokuz demo rolü arasında tek tıkla geçiş
- Program önerisi ve dış kazanım tanıma başvurusu
- Form doğrulama, arama, filtreleme, durum takibi ve 30 günlük pilot göstergesi
- Yapay zekânın karar vermediği komisyon karar destek görünümü
- Gerekçeli onay, revizyon, ret ve çekimser pilot kayıtları
- Simüle değerlendirme ve olay günlüğü; kamera/mikrofon/biyometri yok
- Dijital yeterlilik cüzdanı ve önizleme ortamı içi doğrulama
- ÖBİS, YÖKSİS, e-Devlet, GİB/e-Arşiv, MYS/MAYS, kimlik ve bildirim deneme çalıştırması kartları
- Tahsilat, fatura ve hak ediş simülasyonları
- HTML/CSS grafikler, bildirimler ve denetim izi
- Supabase üzerinde RLS korumalı, salt-okunur sentetik başlangıç görünümü

## Demo rolleri

| Rol | Demo kapsamı |
| --- | --- |
| Öğrenen / Öğrenci | Katalog, başvuru, değerlendirme, cüzdan |
| Üniversite içi eğitici | Program önerisi, program ve başvuru takibi |
| Kurum dışı eğitici | Program önerisi, yeterlilik kanıtı simülasyonu |
| Koordinatörlük / SEM | Ön kontrol, eksik kanıt ve revizyon isteği |
| Komisyon üyesi | Karşılaştırma, gerekçeli akademik pilot karar |
| Öğrenci İşleri | AKTS kontrolü, kayıt ve aktarım taslağı |
| Bilgi İşlem | Entegrasyon kapıları ve denetim |
| Finans / Döner Sermaye | Tahsilat, mutabakat ve hak ediş taslağı |
| Sistem yöneticisi | Teknik denetim; akademik karar yetkisi yok |

## Yerel çalıştırma

Gereksinim: Node.js 22 veya üzeri.

```bash
npm install
npm run dev
```

Ardından `http://localhost:3000` adresini açın. Next.js App Router kök rotası,
pilot ES module uygulamasına ait açık `/pilot.html` rotasına yönlendirir. Bağımlılıksız statik geliştirme
sunucusu gerektiğinde `npm run dev:static` ile `http://localhost:4173` üzerinde açılabilir.

Doğrulama ve iş akışı testleri:

```bash
npm run build
npm run build:static
npm test
```

## Veri mimarisi

Uygulama, Vercel Preview ortamında güvenli ve tekrar oynatılabilir olması için iki katman kullanır:

1. Supabase `pilot_*` tabloları yalnız sentetik başlangıç görünümünü sunar. `anon` ve `authenticated` rolleri sadece `SELECT` yetkisine sahiptir; RLS açıktır ve zorlanır.
2. Kullanıcı etkileşimleri tarayıcıdaki sürümlü `localStorage` çalışma alanında kalıcılaşır. Başvuru/karar/denetim değişiklikleri bu izole pilot durumda gerçekten güncellenir; herhangi bir dış servise gönderilmez.

Şema: [`supabase/migrations/20260819010000_myys_pilot_schema.sql`](supabase/migrations/20260819010000_myys_pilot_schema.sql)

## Görsel varlıklar

ChatGPT Images ile aynı sanat yönetiminde dört özgün illüstrasyon üretildi:

- MYYS ekosistemi ana sayfa hero görseli
- Komisyon karar destek masası
- Dijital yeterlilik ve güven zinciri
- Kontrollü entegrasyon kapıları

Arayüz metinleri, formlar, tablolar, grafikler ve kontroller bu görsellere gömülü değildir. KDPÜ logosu ve GO imzası yüklenen özgün dosyalardan, ayrı `<img>` bileşenleri olarak kullanılır.

## Pilot kurallar ve ihtiyatlar

30 gün, 1 AKTS = 25 saat, %10 AKTS, %50 uzaktan kaynaklı transfer kredisi ve benzerlik bantları yapılandırılabilir **pilot ön kontrol değerleri** olarak sunulur. Bunlar kesin mevzuat veya otomatik karar değildir; kurumsal/Senato doğrulaması gerekir. Yapay zekâ hiçbir zaman onay, ret ya da akademik yetki sahibi olarak gösterilmez.

## Vercel

`vercel.json`, Next.js App Router üzerinden çalışan Preview dağıtımı ve kamera,
mikrofon, konum ile ödeme izinlerinin kapatılması için güvenlik başlıklarını içerir.
Etkileşimli uygulamanın kanonik rotası `/pilot.html`'dir; kök rota bu adrese yönlenir.
Çalışma production'a terfi ettirilmemeli ve production branch'e doğrudan yayımlanmamalıdır.

- Kesin Preview dağıtımı: <https://kdpu-myys-mockup-o9qjtt3wr-info-64116029s-projects.vercel.app/pilot.html>
- Public alias: <https://kampusgo.uzemgo.com/pilot.html> — **Alias doğrulaması: PENDING**

Dokuz rolün domain sözleşmeleri `18/18` başarılıdır. Dokuz rol × dört hedef genişlikten
oluşan 9×4 tarayıcı QA matrisi **36/36 başarılıdır** ([GitHub Actions run #7](https://github.com/gurselveysel/kampusgo/actions/runs/32268491557)).

## Belgeler

- [Kaynak–gereksinim izlenebilirliği](docs/source-traceability.md)
- [Test ve teslim raporu](docs/test-report.md)
- [Tek teslim raporu](docs/delivery-report.md)

## Production NO-GO — kesin karar

Bu pilotta gerçek öğrenci/personel verisi, gerçek ödeme, e-fatura, kurumsal kimlik, kamera/mikrofon kaydı, biyometri, SMS/e-posta veya canlı ÖBİS/YÖKSİS/e-Devlet/GİB/MYS çağrısı yoktur. **Bu teslimin kabul edilen dağıtımı READY `target: null` Preview'dır; production'a terfi ettirilmemiştir.** Vercel proje ilk kurulumunda oluşmuş eski `dpl_4kwgoosKHY1aw5H8QbjNthZ5j1JC` production hedefi bu teslimde değiştirilmemiş ve `kampusgo.uzemgo.com` için kullanılmamıştır.
