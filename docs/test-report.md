# Test ve teslim raporu

Tarih: 19 Ağustos 2026
Hedef ortam: Yalnız Vercel Preview
Karar: **Production NO-GO**

## Test edilen dağıtım ve rotalar

- Kesin Preview dağıtımı: <https://kdpu-myys-mockup-o9qjtt3wr-info-64116029s-projects.vercel.app/pilot.html>
- Public alias: <https://kampusgo.uzemgo.com/pilot.html>
- Uygulama rotası: `/pilot.html`
- Kök rota davranışı: `/` → `/pilot.html`
- Alias doğrulaması: **PENDING**

## Otomatik kontroller

| Kontrol | Kapsam | Sonuç |
| --- | --- | --- |
| Kaynak söz dizimi | `src/app.js`, `data.js`, `workflow.js`, `supabase.js`, `server.mjs` | Başarılı |
| Yapı doğrulama | Zorunlu dosyalar, marka/görsel referansları, production sır taraması | Başarılı |
| Dokuz rol domain sözleşmesi | Sahiplik, görünürlük, geçiş yetkisi, değerlendirme kararı, audit ve iki uçtan uca senaryo | **18/18 başarılı** |
| Supabase güvenlik | RLS + FORCE RLS, salt-okunur grant, sentetik/simülasyon değişmezleri | Başarılı |
| 9×4 tarayıcı QA | 9 rol × 1440, 1024, 768 ve 390 px = 36 rol/görünüm kombinasyonu | **36/36 başarılı** — [run #7](https://github.com/gurselveysel/kampusgo/actions/runs/32268491557) |
| Public alias smoke | `kampusgo.uzemgo.com/pilot.html`, rota, içerik ve asset yükleme | **PENDING** |

## 18/18 domain kabul kapsamı

- Dokuz rolün benzersiz kimlikleri ve rol navigasyonu
- Demo rolü ile sentetik aktör adının birebir eşleşmesi
- Aynı hash üzerinde rol değişiminde anlık yeniden render
- Başvuru sahipliği ve aynı roldeki farklı kişilerin ayrılması
- Taslak, başvuru ve program görünürlüğünün rol/kişi bazında filtrelenmesi
- Kurum dışı eğitici önerisinin doğru `ownerRole`, kişi ve audit rolüyle kaydı
- Öğrenene özel dış kazanım tanıma sınırı
- Koordinatör, Komisyon ve sistem yöneticisi akademik karar ayrımı
- Gerekçeli onay, ret, revizyon ve çekimser görüş audit davranışı
- İnsan değerlendirici kararının yalnız iç eğitici, dış eğitici ve Komisyon rolüne açılması
- Tamamlanmış değerlendirmede tekrar karar ve geçersiz puan engeli
- Pilot yeterlilik oluşturma ve mükerrer kod engeli
- İki uçtan uca senaryoda kalıcı durum ve `realDataSent=false` aktarım kaydı

## 9×4 tarayıcı QA kabul matrisi

Her hedef genişlikte dokuz rol için aşağıdaki davranışlar otomatik olarak doğrulanmıştır:

- Rol seçici, persona kartı, başlık ve role özgü navigasyon
- Global CTA ve bildirim zilinin izinli rotalarla uyumu
- Kurum dışı eğiticinin gerçek form gönderimi ve sahiplik kaydı
- Başvuru/program filtreleri, boş durumlar ve doğrudan rota engeli
- Değerlendirme başlatma ve insan kararı CTA sınırları
- Koordinatör/Komisyon/admin karar eylemi ayrımı
- Finans, entegrasyon ve audit mutasyon kapıları
- v6 `localStorage` restore ve bozuk şemada güvenli fallback
- Modal, toast, menü backdrop, klavye odağı ve görünür pilot uyarısı
- Kırık görsel, belge düzeyi yatay taşma ve mobil kontrol kesilmesi

Matris 19 Ağustos 2026 15:17 UTC'de hatasız tamamlanmıştır: dört viewportun her birinde
`rolesChecked: 9`, `errors: []`. Ekran görüntüleri ve JSON raporu
[QA kanıt paketinde](https://github.com/gurselveysel/kampusgo/actions/runs/32268491557/artifacts/9371422369) saklanır.

## Ana demo senaryoları

1. İç eğitici yeni programı gönderir; koordinatör/Komisyon incelemesi, gerekçeli karar, katalog, öğrenen kaydı, değerlendirme ve cüzdan adımları pilot durumda güncellenir.
2. Öğrenen dış kazanım formunu gönderir; deterministik analiz işaretleri, Komisyon görüşü, tanınan kredi ve ÖBİS/YÖKSİS aktarım simülasyonu gerçek servis çağrısı olmadan izlenir.

Domain testinde Senaryo 1'in 12 ve Senaryo 2'nin 8 adımı çalıştırılmış; her iki senaryonun
durum, audit ve güvenli aktarım değişmezleri doğrulanmıştır.

## Bilinen pilot sınırları

- Etkileşimli pilot arayüzü bağımlılıksız HTML/CSS/ES module bileşenlerini korur; dağıtım ve kök yönlendirme katmanı Next.js 16 App Router ile çalışır. Tailwind dönüşümü bu pilot kapsamına alınmamıştır.
- Supabase uzak katmanı salt-okunur başlangıç görünümüdür; tarayıcı mutasyonları izole, sürümlü `localStorage` çalışma alanında kalır.
- Gerçek QR kod, dijital imza, standart uygunluk testi, e-posta/SMS, ödeme, dosya aktarımı ve dış entegrasyon yoktur.
- Resmî mevzuat, mali parametreler ve EK-1 alan şeması yetkili kurumsal birimlerce ayrıca doğrulanmalıdır.
- Public alias için son HTTP/asset doğrulaması **PENDING** durumundadır.
- Production deployment, production branch yayını ve canlı kurumsal bağlantı kesin olarak kapsam dışıdır.

## Production teyidi

**Production deployment yapılmamıştır.** Kesin Preview URL'si ve public alias yalnız
kontrollü pilotu göstermelidir; production terfisi, canlı veri veya gerçek servis çağrısı yoktur.
