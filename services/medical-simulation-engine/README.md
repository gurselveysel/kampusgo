# TEYS / MAMS Medical Simulation Engine

Bu dizin, `app/medikal-simulasyon` altında çalışan etkileşimli klinik simülasyon arayüzünün gelecekteki yapay zekâ, animasyon ve kalıcı senaryo servisleri için ayrılmıştır.

## Ürün sınırı

TEYS — Tıp Eğitimi Yönetim Sistemi / MAMS — Medical Education Management System içindeki Medikal Simülasyon modülü klasik bir LMS içerik listesi değildir. Temel döngü:

`Gözlemle → Düşün → Karar ver → Uygula → Sonucu gör → Değerlendir → Yeniden dene`

Sekiz modül zorunlu sırada ilerler:

1. Sanal Hasta
2. Olguya Dayalı Öğrenme
3. Klinik Akıl Yürütme
4. Tanı ve Tetkik
5. Tedavi ve Müdahale
6. Acil Durum Simülasyonları
7. Ekip Yönetimi & Klinik Liderlik
8. Entegre Klinik Simülasyon

Bir modülün minimum yeterlilik ölçütü tamamlanmadan sonraki modül açılamaz.

## Program kompozisyonu

Pilot tasarım kararı:

- `%70`: UÇEP referanslı çekirdek yeterlilik alanı
- `%30`: kurumun program çıktıları, yerel olguları, seçmeli derinleşme ve özerk tasarım alanı

Bu oran resmî UÇEP eşlemesi veya akreditasyon beyanı değildir. Nihai eşleme akademik kurul, program değerlendirme komisyonu ve ilgili resmî kaynaklar üzerinden doğrulanmalıdır.

## Mevcut çalışan katman

`app/medikal-simulasyon` tarayıcı içinde çalışan deterministik kontrollü pilotu korur:

- sekiz ön koşullu modül,
- sentetik STEMI → VF arrest senaryosu,
- animasyonlu sanal hasta,
- canlı EKG ve vital monitörü,
- kararların vital, süre, maliyet ve puana etkisi,
- aşamalı bilgi açılımı,
- tetkik maliyeti ve tanısal değer,
- ilaç/kontrendikasyon etkileri,
- zaman kritik resüsitasyon,
- ekip görev dağılımı ve kapalı döngü iletişim,
- ayrıntılı debriefing,
- yerel pilot ilerleme kaydı.

Bu katmana ek olarak seçilen son klinik karar, güvenli Next.js sunucu geçidi üzerinden gerçek arXivisual AI → doğrulama → Manim render işine dönüştürülebilir. Arayüz; pilot erişimi, uzman onay referansı, iş ilerlemesi ve korunan MP4 oynatmayı tek akışta sunar. Backend servis anahtarı tarayıcıya verilmez.

Gerçek hasta verisi, klinik karar desteği, canlı hastane entegrasyonu veya biyometrik veri kullanılmaz. Haricî AI sağlayıcısı ve container servisi etkin değilse deterministik simülasyon çalışmaya devam eder; gerçek sahne üretimi bu durumda `DOĞRULANMADI` olarak kalır.

## Upstream animasyon tabanı

GitHub Actions, `feature/teys-medical-simulation*` dallarında açılan pull request'lerde onaylanmış `rajshah6/arXivisual` backend çalışma ağacını aşağıdaki konuma aktarır:

`services/medical-simulation-engine/vendor/arxivisual-backend`

Kaynak commit'i `UPSTREAM_COMMIT`, kullanım ve provenance kaydı `UPSTREAM_SOURCE.md` dosyasında tutulur. Runtime veritabanları, cache, oluşturulmuş medya ve demo videoları içe aktarılmaz.

Upstream motorun etkin kullanım alanları:

- klinik kavram animasyonları,
- prosedür açıklama sahneleri,
- ritim ve fizyoloji görselleştirmeleri,
- senaryo öncesi mikro anlatımlar,
- debriefing sırasında uzman yaklaşımı animasyonları.

Medikal adaptör doğrudan upstream `ManimGenerator`, `CodeValidator` ve `process_visualization` katmanlarını kullanır. AI çıktısı ayrıca AST tabanlı izin listesiyle incelenir; dosya, ağ, süreç, reflection ve sınırsız döngü yolları reddedilir. Ham Python/Manim render uç noktası medikal API yüzeyinde hiç kayıtlı değildir. Kod yalnız izole worker/container içinde, süre–CPU–RAM–disk sınırlarıyla çalıştırılır.

## Uygulanan servis mimarisi

```text
TEYS / MAMS Next.js arayüzü
          │
          ├── Kimlik, rol, ön koşul ve yeterlilik geçidi
          │
          ├── Scenario Orchestrator
          │      ├── sentetik hasta durumu
          │      ├── klinik olay motoru
          │      ├── karar ve zaman çizelgesi
          │      └── skor / debriefing motoru
          │
          ├── Visual Generation API
          │      ├── klinik storyboard
          │      ├── Manim sahnesi
          │      ├── seslendirme
          │      └── görsel kalite kapıları
          │
          └── İzole Render Worker
                 ├── ağ erişimi kapalı/izinli liste
                 ├── CPU, RAM, PID ve süre kotası
                 └── nesne depolama + denetim izi
```

## Veri ve güvenlik ilkeleri

- Gerçek öğrenci veya hasta verisi production hazırlığı tamamlanmadan işlenmez.
- Hasta verileri sentetik veya geri döndürülemez şekilde anonimleştirilmiş olmalıdır.
- Öğrenci kararı ile klinik sonuç arasındaki her durum değişimi değişmez denetim olayına yazılmalıdır.
- Yapay zekâ klinik karar vermez; senaryo varyasyonu, açıklama ve görsel üretim desteği sağlar.
- Her scenario/version kaydı; kaynak, uzman onayı, UÇEP eşleme sürümü ve bütünlük hash'i taşımalıdır.
- Eğitici onayı olmadan senaryo öğrenciye yayımlanmaz.
- Production kararı şimdilik `NO-GO` durumundadır.

## Kalan production ön koşulları

1. Kurum, program, kurul, öğrenci ve eğitici rol sınırlarını gerçek kimlik sistemiyle eklemek.
2. Scenario event ve uzman onay kayıtlarını PostgreSQL/RLS tabanlı değişmez denetim izine taşımak.
3. UÇEP referans veri sürümleme ve akademik kurul onay akışını tamamlamak.
4. Render container'ını güncel fiyat kullanıcı tarafından onaylandıktan sonra ayrı HTTPS pilot ortamına almak.
5. Azure OpenAI veya Dedalus secret'larını secret manager'da tanımlayıp maliyet bütçesi/alarmları eklemek.
6. Sentetik ve uzman onaylı tek örnekle gerçek AI + Manim uçtan uca pilot kanıtını üretmek.
7. Gerçek cihaz/monitör veya hastane entegrasyonuna geçmeden bağımsız güvenlik ve tıp eğitimi QA yürütmek.
