# TEYS / MAMS Medikal Simülasyon — arXivisual Uçtan Uca Çalıştırma

## Gerçek çalışma zinciri

```text
Uzman onaylı scenario-event
      ↓
TEYS güvenlik ve hak kapısı
      ↓
arXivisual VisualizationPlan
      ↓
arXivisual ManimGenerator (Azure/Dedalus varsa)
      ↓
CodeValidator → SpatialValidator → RenderTester
      ↓
İzole Manim subprocess
      ↓
MP4 + SHA-256 + storyboard + validation report
      ↓
KampüsGO korunan media gateway
      ↓
/medikal-simulasyon/ai-studio
```

AI sağlayıcısı yapılandırılmamışsa zincir, klinik kural üretmeyen deterministik TEYS sahne şablonunu kullanır; ancak kod doğrulama, mekânsal doğrulama, import testi ve Manim render yine arXivisual backend üzerinden yürür. `MEDICAL_AI_MODE=azure` veya `dedalus` seçildiğinde fallback kapatılır ve gerçek AI üretimindeki hata işi başarısız yapar.

## Backend

```bash
cd services/medical-simulation-engine
cp .env.example .env
docker compose build
docker compose up -d
curl --fail http://127.0.0.1:8002/api/medical/health
```

Korunan katalog:

```bash
curl --fail -H "X-TEYS-Engine-Key: $TEYS_ENGINE_API_KEY" http://127.0.0.1:8002/api/medical/catalog
```

Ham Python kabul eden bir API bulunmaz.

## KampüsGO server gateway

```dotenv
MEDICAL_SIMULATION_GATEWAY_ENABLED=true
MEDICAL_SIMULATION_ENGINE_URL=http://127.0.0.1:8002
MEDICAL_SIMULATION_ENGINE_KEY=backend-ile-ayni-deger
MEDICAL_SIMULATION_PILOT_ACCESS_TOKEN=ikinci-ve-farkli-en-az-32-karakterli-deger
```

Secret değerleri `NEXT_PUBLIC_` önekiyle tanımlanmaz.

## Çalışma ekranları

- `/medikal-simulasyon`: deterministik öğrenci simülasyonu ve ön koşullu ilerleme
- `/medikal-simulasyon/ai-studio`: uzman-onaylı olaydan arXivisual/Manim video üretimi
- `/api/medical-simulation/health`: server gateway sağlık durumu

AI Studio, ayrı pilot anahtarını doğruladıktan sonra HttpOnly/SameSite=Strict oturum çerezi kullanır. Backend engine key tarayıcıya gönderilmez.

## Tohum render

`.github/workflows/medical-simulation-arxivisual-seed.yml` gerçek Docker image'ını kurar, FastAPI job endpoint'ine `presets/vf-rosc.json` gönderir, işi tamamlanana kadar izler ve üretilen MP4 ile manifesti `public/medical-simulation/manim/` altına commit eder.

Bu çalışma arXivisual validator'larını, local renderer'ı, Manim subprocess'ini, TEYS güvenlik API'sini, job polling'i ve video teslimini tek zincirde doğrular.

## Gerçek AI modu

```dotenv
MEDICAL_AI_MODE=azure
AZURE_OPENAI_ENDPOINT=https://RESOURCE.openai.azure.com
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_DEPLOYMENT=gpt-5
AZURE_OPENAI_REASONING_EFFORT=low
```

`auto` modunda provider yoksa deterministik fallback çalışır. `azure` modunda provider yoksa veya AI kodu kalite kapılarını geçemezse iş başarısız olur; sessizce klinik kural değiştirilmez.

## Değişmez güvenlik sınırları

- Hasta sentetik olmalıdır.
- En az bir kaynak ve uzman onay referansı zorunludur.
- Kaynak/türev kullanım hakkı açıkça doğrulanır.
- AI tanı, doz, kontrendikasyon veya fizyolojik sonuç icat edemez.
- Üretilen Python AST denetiminden geçer; ağ, dosya, subprocess ve dinamik kod çağrıları reddedilir.
- Aynı anda bir iş ve saatte üç iş sınırı uygulanır.
- Gerçek hasta veya öğrenci verisi kullanılmaz.
- Production kararı **NO-GO** olarak kalır.
