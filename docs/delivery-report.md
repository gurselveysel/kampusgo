# MYYS kontrollü pilot — tek teslim raporu

Tarih: 19 Ağustos 2026  
Karar: **Production NO-GO**

## Teslim durumu

| Çıktı | Durum | Not |
| --- | --- | --- |
| Çalışan uygulama | Hazır | Gerçek HTML/CSS/ES module bileşenleri; ekran görüntüsü tabanlı arayüz değildir |
| Vercel Preview | Hazır | Korumalı Preview dağıtımı; production terfisi yapılmadı |
| Supabase pilot şeması | Hazır | `xpjkrwzgimdxsasqszfi`; RLS + FORCE RLS, yalnız sentetik ve salt-okunur başlangıç görünümü |
| Yerel Git sürüm kaydı | Hazır | Kaynak teslimi yerel commit ve arşivle sabitlendi |
| GitHub uzak deposu | Hazır | `gurselveysel/kampusgo`; yalnız kaynak aynası, production otomatik yayını yok |

Korumalı Preview: <https://kdpu-myys-mockup-r3rr3iuv8-info-64116029s-projects.vercel.app>

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

- Kaynak söz dizimi, yapı/secret taraması, build ve iş akışı testleri başarılıdır.
- Senaryo 1'in 12 ve Senaryo 2'nin 8 adımı canlı Preview'da çalıştırılmıştır; durum yenileme sonrasında korunmuştur.
- 1440, 1024, 768 ve 390 px hedeflerinde belge düzeyinde yatay taşma `0 px`, pilot uyarısı görünür ve kırık görsel sayısı sıfırdır.
- Supabase katmanında RLS + FORCE RLS, salt-okunur grant'ler, sentetik veri ve `real_data_sent=false` değişmezleri doğrulanmıştır.

## Bilinen pilot sınırları

- Etkileşimli arayüz bağımlılıksız HTML/CSS/ES module bileşenlerini korur; Vercel
  dağıtımı Next.js 16 App Router kabuğu üzerinden yapılır. Tailwind dönüşümü bu pilot
  kapsamına alınmamıştır.
- Supabase uzak katmanı salt-okunur başlangıç görünümüdür; kullanıcı mutasyonları tarayıcıdaki izole, sürümlü `localStorage` çalışma alanındadır.
- Gösterilen QR yalnız dekoratif pilot simülasyonudur; taranabilir üretim QR'ı, kurumsal imza ve W3C/Open Badges uygunluk iddiası yoktur.
- Gerçek kimlik, kişisel veri, dosya içeriği, ödeme, e-fatura, kamera/mikrofon, biyometri, SMS/e-posta ve dış servis çağrısı yoktur.
- Kural oranları, mevzuat yorumu ve EK-1 alanları yetkili kurumsal birim doğrulamasına açıktır.
- Preview korumalıdır; ekip dışı erişim için süreli paylaşım bağlantısı gerekir.

## Kurulum

Node.js 22 veya üzeriyle:

```bash
npm install
npm run dev
npm test
npm run build
```

Yerel adres: `http://localhost:3000` (`npm run dev:static` için `http://localhost:4173`)

## Production teyidi

Production deployment yapılmadı; `kampusgo.uzemgo.com` yalnız Preview alias hedefi
olarak yapılandırılır. Production branch, gerçek Supabase mutasyonu veya canlı kurumsal servis
bağlantısı oluşturulmadı.
