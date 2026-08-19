# MYYS kontrollü pilot — tek teslim raporu

Tarih: 19 Ağustos 2026  
Karar: **Production NO-GO**

## Teslim durumu

| Çıktı | Durum | Not |
| --- | --- | --- |
| Çalışan uygulama | Hazır | Gerçek HTML/CSS/ES module bileşenleri; ekran görüntüsü tabanlı arayüz değildir |
| Vercel Preview | Hazır | Preview-only dağıtım; uygulama `/pilot.html` rotasında, production terfisi yapılmadı |
| Public alias | Doğrulama bekliyor | `kampusgo.uzemgo.com/pilot.html`; alias doğrulaması PENDING |
| Supabase pilot şeması | Hazır | `xpjkrwzgimdxsasqszfi`; RLS + FORCE RLS, yalnız sentetik ve salt-okunur başlangıç görünümü |
| Yerel Git sürüm kaydı | Hazır | Kaynak teslimi yerel commit ve arşivle sabitlendi |
| GitHub uzak deposu | Hazır | `gurselveysel/kampusgo`; yalnız kaynak aynası, production otomatik yayını yok |

- Kesin Preview dağıtımı: <https://kdpu-myys-mockup-ltc17soi8-info-64116029s-projects.vercel.app/pilot.html>
- Public alias: <https://kampusgo.uzemgo.com/pilot.html>
- Alias doğrulaması: **PENDING**
- Kök rota: `/` → `/pilot.html`

## Tamamlanan ekranlar

- Kurumsal açılış, pilot kapsamı, altı evre, demo giriş/rol değiştirici
- Dokuz rol için rol bazlı özet ve navigasyon
- Katalog, programlar, öğrenen eğitim/AKTS görünümü
- Program önerisi ile dış kazanım tanıma formları; doğrulama, taslak, önizleme ve sentetik dosya üst verisi
- Başvuru arama/filtreleme, SLA, durum takibi ve denetim izi
- Koordinatörlük/Komisyon karar masası; karşılaştırma, kanıt, görüş ve gerekçeli kararlar
- Ölçme-değerlendirme simülasyonu; olay günlüğü ve insan değerlendirici kararı
- Dijital yeterlilik cüzdanı ve pilot doğrulama rotası
- Yedi bağlı-olmayan entegrasyon kartı; hata, yeniden deneme, onay ve aktarım logları
- Finans/Döner Sermaye; tahsilat, fatura-hak ediş taslağı, mali parametre ve mutabakat
- Raporlama, grafikler, bildirimler, boş/hata/yükleniyor durumları
- İki uçtan uca senaryo çalıştırıcısı

## Demo rolleri

1. Öğrenen / Öğrenci
2. Üniversite içi eğitici
3. Kurum dışı eğitici
4. Koordinatörlük / SEM
5. Mikro Yeterlilik Komisyonu üyesi
6. Öğrenci İşleri yetkilisi
7. Bilgi İşlem yetkilisi
8. Finans / Döner Sermaye yetkilisi
9. Sistem yöneticisi — akademik karar yetkisi yok

## ChatGPT Images varlıkları

1. MYYS ekosistemi ana sayfa hero illüstrasyonu
2. Komisyon karar destek masası illüstrasyonu
3. Dijital yeterlilik ve güven zinciri illüstrasyonu
4. Kontrollü entegrasyon kapıları illüstrasyonu

Tüm logolar özgün yüklenen dosyalardan ayrı `<img>` bileşenleriyle kullanıldı; oluşturulan görsellerin içine logo, düğme, form, tablo veya uzun metin gömülmedi.

## Test özeti

- Kaynak söz dizimi, yapı/secret taraması ve build doğrulamaları başarılıdır.
- Dokuz rolün sahiplik, görünürlük, kritik eylem, değerlendirme kararı, audit ve iki uçtan uca senaryo domain sözleşmeleri **18/18 başarılıdır**.
- Domain testinde Senaryo 1'in 12 ve Senaryo 2'nin 8 adımı tamamlanmış; kalıcı durum ve `realDataSent=false` değişmezleri doğrulanmıştır.
- Dokuz rol × 1440, 1024, 768 ve 390 px hedeflerinden oluşan 9×4 tarayıcı QA matrisi **36/36 başarılıdır** ([run #17](https://github.com/gurselveysel/kampusgo/actions/runs/32275262333); [kanıt paketi](https://github.com/gurselveysel/kampusgo/actions/runs/32275262333/artifacts/9373767031)).
- Public alias üzerinde rota, içerik ve asset smoke doğrulaması **PENDING** durumundadır.
- Supabase katmanında RLS + FORCE RLS, salt-okunur grant'ler, sentetik veri ve `real_data_sent=false` değişmezleri doğrulanmıştır.

## Bilinen pilot sınırları

- Etkileşimli arayüz bağımlılıksız HTML/CSS/ES module bileşenlerini korur; Vercel
  dağıtımı Next.js 16 App Router kabuğu üzerinden yapılır. Tailwind dönüşümü bu pilot
  kapsamına alınmamıştır.
- Supabase uzak katmanı salt-okunur başlangıç görünümüdür; kullanıcı mutasyonları tarayıcıdaki izole, sürümlü `localStorage` çalışma alanındadır.
- Gösterilen QR yalnız dekoratif pilot simülasyonudur; taranabilir üretim QR'ı, kurumsal imza ve W3C/Open Badges uygunluk iddiası yoktur.
- Gerçek kimlik, kişisel veri, dosya içeriği, ödeme, e-fatura, kamera/mikrofon, biyometri, SMS/e-posta ve dış servis çağrısı yoktur.
- Kural oranları, mevzuat yorumu ve EK-1 alanları yetkili kurumsal birim doğrulamasına açıktır.
- Public alias için son HTTP/asset doğrulaması PENDING durumundadır; doğrulama bitmeden alias için PASS iddiası yapılmaz.

## Kurulum

Node.js 22 veya üzeriyle:

```bash
npm install
npm run dev
npm test
npm run build
```

Yerel adres: `http://localhost:3000` (kök rota `/pilot.html`'e yönlenir; `npm run dev:static` için `http://localhost:4173`)

## Production teyidi

Bu teslimde kabul edilen `dpl_7s2ZL879z7dYSUpgnkrHn8Jjdkzd` dağıtımı READY **Preview**'dır
(`target: null`) ve production'a terfi ettirilmedi; karar kesin **NO-GO**'dur. Vercel proje
ilk kurulumundan kalan eski `dpl_4kwgoosKHY1aw5H8QbjNthZ5j1JC` production hedefi
değiştirilmedi, özel alan adına bağlanmadı ve bu kabulde kullanılmadı.
`kampusgo.uzemgo.com/pilot.html` yalnız public Preview alias hedefidir; production branch,
gerçek Supabase mutasyonu veya canlı kurumsal servis bağlantısı oluşturulmadı.
