# TEYS / MAMS Medical Simulation Engine

Bu servis, `app/medikal-simulasyon` arayüzünü onaylı `arXivisual` Manim/AI kod tabanına bağlayan kontrollü üretim ve render katmanıdır.

> **Eğitim simülasyonu sınırı:** Gerçek hasta bakımı, klinik karar desteği, tanı veya tedavi önerisi üretmez. Yalnız sentetik ya da geri döndürülemez biçimde anonimleştirilmiş ve uzman onaylı senaryo geçişleri kabul edilir.

## Uygulanan mimari

```text
TEYS / MAMS Next.js arayüzü
        │
        ├── /api/medikal-simulasyon/engine  (sunucu tarafı proxy)
        │
        ▼
FastAPI Clinical Scene API
        ├── yapılandırılmış sentetik senaryo sözleşmesi
        ├── PHI / gerçek kişi verisi reddi
        ├── kaynak + uzman onay kapısı
        ├── %70 UÇEP referanslı çekirdek / %30 kurumsal özerklik etiketi
        │
        ▼
Vendored arXivisual engine
        ├── VisualizationPlanner
        ├── ManimGenerator
        ├── CodeValidator
        ├── SpatialValidator
        ├── VoiceoverScriptValidator
        ├── RenderTester (isteğe bağlı)
        └── process_visualization
        │
        ▼
İzole Manim container / nesne depolama
```

Ham Python veya Manim kodu kabul eden genel bir API **yoktur**. Kod yalnız servis içinde, yapılandırılmış klinik istekten üretilir; allow-list ve doğrulama kapılarından geçmeden render katmanına ulaşamaz.

## Sekiz zorunlu eğitim düzeyi

1. Sanal Hasta
2. Olguya Dayalı Öğrenme
3. Klinik Akıl Yürütme
4. Tanı ve Tetkik
5. Tedavi ve Müdahale
6. Acil Durum Simülasyonları
7. Ekip Yönetimi & Klinik Liderlik
8. Entegre Klinik Simülasyon

Tarayıcı pilotu; ön koşul, yeterlilik, canlı vital değişimi, karar zaman çizelgesi, maliyet, ekip yönetimi ve ayrıntılı debriefing döngüsünü uygular.

## Servis modları

| Mod | Davranış |
| --- | --- |
| `preview` | Model anahtarı veya Manim gerektirmeyen deterministik storyboard ve güvenli Manim kodu üretir. CI ve Vercel Preview için varsayılandır. |
| `ai` | Vendored `VisualizationPlanner` ve `ManimGenerator` ile gerçek LLM üretimi yapar; doğrulanmış kod döndürür, video render etmez. |
| `render` | AI üretimine ek olarak, iki ayrı render kapısı açık olduğunda izole Manim worker üzerinde MP4 üretir. |

`render` için hem `MEDICAL_ENGINE_MODE=render` hem `MEDICAL_ENGINE_ALLOW_RENDER=1` gerekir. Manim binary veya LLM sağlayıcısı yoksa servis fail-closed biçimde daha düşük moda iner; render isteğini sessizce taklit etmez.

## API

- `GET /health` — servis, upstream, LLM, Manim ve render kapısı durumu
- `GET /v1/capabilities` — desteklenen modüller, görsel türleri ve güvenlik sınırı
- `POST /v1/scene-plans` — deterministik, anlık klinik storyboard
- `POST /v1/scene-jobs` — gerçek AI/Manim üretim işi
- `GET /v1/scene-jobs/{job_id}` — iş ilerlemesi, doğrulama ve video URL'si
- `GET /v1/examples/stemi-vf` — sentetik sözleşme örneği

Production ortamında `/docs` ve `/redoc` kapalıdır. `MEDICAL_ENGINE_API_TOKEN` zorunludur.

## Klinik istek kapıları

Her üretim isteği şu bilgileri taşır:

- `scenario_id` ve sürüm,
- 1–8 arası modül,
- öğrenme çıktısı,
- `SYN-...` ile başlayan sentetik hasta kimliği,
- önceki ve sonraki vital/klinik durum,
- öğrencinin eylemi ve gerekçesi,
- görsel odak,
- güvenlik kısıtları,
- onaylı kaynak kayıtları,
- uzman onay referansı,
- UÇEP eşleme kodları,
- yatay ve dikey entegrasyon etiketleri.

E-posta, telefon, T.C. kimlik numarası, açık hasta adı veya dosya/protokol numarası benzeri olası gerçek kişi verileri LLM çağrısından önce reddedilir.

## Üretilen kod güvenlik kapıları

1. Python AST / Manim yapı doğrulaması
2. Ekran sınırı, çakışma ve yerleşim analizi
3. Türkçe klinik anlatım ve kavram uyumu
4. İthalat allow-list'i
5. `open`, `exec`, `eval`, ağ, süreç ve dosya sistemi erişimi reddi
6. İsteğe bağlı import-time Manim testi
7. Başarısız üretimde sınırlı geri bildirimli yeniden deneme
8. Tüm kapılar geçmeden render yasağı

Container örneği root olmayan kullanıcı, salt okunur dosya sistemi, PID/CPU/RAM limiti, `no-new-privileges` ve geçici render alanı ile tanımlanmıştır.

## Yerel çalışma

### Hafif preview modu

```bash
cd services/medical-simulation-engine
python -m venv .venv
. .venv/bin/activate
pip install ".[test]"
cp .env.example .env
uvicorn runtime.main:app --reload --port 8000
```

### Tam AI + Manim container

```bash
cd services/medical-simulation-engine
cp .env.example .env
# Azure/Dedalus anahtarlarını ve güçlü MEDICAL_ENGINE_API_TOKEN değerini girin.
docker compose -f docker-compose.example.yml up --build
```

Önce `MEDICAL_ENGINE_MODE=ai` ile kod üretimi doğrulanmalı; bağımsız güvenlik/klinik QA tamamlandıktan sonra render kapısı açılmalıdır.

## Next.js bağlantısı

Vercel/Next.js sunucu ortamına yalnız şu iki gizli değişken eklenir:

```text
MEDICAL_SIMULATION_ENGINE_URL=https://<container-host>
MEDICAL_SIMULATION_ENGINE_TOKEN=<service-token>
```

Tarayıcı token'ı görmez. `/api/medikal-simulasyon/engine` proxy'si sağlık, örnek, iş oluşturma ve iş sorgulama isteklerini sunucu tarafından iletir.

Motor konsolu:

```text
/medikal-simulasyon/motor
```

## Upstream kaydı

Onaylı kaynak anlık görüntüsü:

```text
services/medical-simulation-engine/vendor/arxivisual-backend
```

- Kesin commit: `UPSTREAM_COMMIT`
- Kaynak/provenance: `UPSTREAM_SOURCE.md`
- Klinik overlay: `prompts/clinical-simulation-scene-generator.md`

Runtime veritabanları, cache, oluşturulmuş medya ve demo videoları vendor kopyasına alınmaz.

## Program kompozisyonu

Pilot portföy kuralı:

- `%70`: UÇEP referanslı çekirdek yeterlilik alanı
- `%30`: kurumun program çıktıları, yerel olguları, seçmeli derinleşme ve özerk tasarım alanı

Bu oran ve yazılım etiketleri tek başına resmî UÇEP eşlemesi ya da akreditasyon beyanı değildir. Her senaryo sürümü akademik kurul tarafından kaynak, öğrenme çıktısı, ölçme planı ve yatay/dikey entegrasyon matrisiyle doğrulanmalıdır.

## Kalıcılık ve production kapısı

Mevcut iş kayıt deposu kontrollü pilot için bellek içidir. Container yeniden başlatıldığında işler korunmaz. Production öncesinde:

- Postgres/Temporal tabanlı dayanıklı iş kuyruğu,
- kurum/rol/RLS sınırları,
- değişmez denetim izi,
- kaynak ve uzman onay sürümleme,
- video saklama ve silme politikası,
- bağımsız sızma testi,
- tıp eğitimi ve klinik içerik QA

zorunludur. Bu koşullar tamamlanmadan production kararı `NO-GO` olarak kalır.
