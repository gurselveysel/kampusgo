# TEYS / MAMS Medical Simulation Engine — arXivisual Entegrasyonu

Bu servis, `app/medikal-simulasyon` içindeki ön koşullu klinik simülasyon ile gerçek Manim sahne üretimini uçtan uca bağlar.

## Çalışan ürün zinciri

```text
Uzman onaylı sentetik olay sözleşmesi
          ↓
TEYS hak / kaynak / sentetik hasta kapısı
          ↓
ArXivisual VisualizationPlan
          ↓
ArXivisual ManimGenerator (Azure veya Dedalus)
          ↓
CodeValidator → SpatialValidator → RenderTester
          ↓
AST güvenlik denetimi
          ↓
ArXivisual local Manim renderer
          ↓
MP4 + SHA-256 + storyboard + validation raporu
          ↓
KampüsGO server-side gateway
          ↓
/medikal-simulasyon/ai-studio
```

AI provider yapılandırılmamışsa sistem klinik kural üretmeyen deterministik TEYS sahnesine düşer; ancak kod doğrulama, mekânsal doğrulama, import testi ve Manim render yine vendored arXivisual backend üzerinden yürütülür.

## Kaynak taban

- Upstream: `rajshah6/arXivisual`
- İçe aktarılan bileşen: `backend/`
- Yerel yol: `vendor/arxivisual-backend`
- Exact commit: `UPSTREAM_COMMIT`
- Kaynak/izin kaydı: `UPSTREAM_SOURCE.md`

Runtime veritabanları, cache ve oluşturulmuş medya kaynak snapshot'ına alınmaz.

## Medikal güvenlik overlay'i

ArXivisual tek başına klinik kural kaynağı olarak kullanılmaz. TEYS runtime şu zorunlu kapıları ekler:

- `rights_confirmed=true`,
- `synthetic_patient_confirmed=true`,
- en az bir kaynak referansı,
- uzman onay referansı,
- onaylanmış `patient_state_before → patient_state_after` geçişi,
- tanı/doz/kontrendikasyon/fizyoloji icat etmeme,
- genel kullanıcıya ham Python veya render uç noktası açmama,
- üretilen kodda ağ, dosya, subprocess ve dinamik kod çağrılarını AST düzeyinde reddetme,
- tek eşzamanlı iş ve saatlik kota,
- her sonuçta storyboard, validator çıktısı ve SHA-256 bütünlük özeti.

## API

| Yöntem | Uç nokta | Erişim |
|---|---|---|
| GET | `/api/medical/health` | Sağlık kontrolü |
| GET | `/api/medical/catalog` | `X-TEYS-Engine-Key` |
| POST | `/api/medical/jobs` | `X-TEYS-Engine-Key` |
| GET | `/api/medical/jobs/{job_id}` | `X-TEYS-Engine-Key` |
| GET | `/api/medical/jobs/{job_id}/result` | `X-TEYS-Engine-Key` |
| GET | `/api/medical/media/{asset_id}` | `X-TEYS-Engine-Key` |

Ham Manim kodu kabul eden bir API yoktur.

## AI modları

- `MEDICAL_AI_MODE=auto`: Azure/Dedalus varsa arXivisual AI üretimi; yoksa deterministik fallback.
- `MEDICAL_AI_MODE=azure`: Azure zorunlu; hata olursa iş başarısız.
- `MEDICAL_AI_MODE=dedalus`: Dedalus zorunlu; hata olursa iş başarısız.
- `MEDICAL_AI_MODE=template`: AI çağrısı olmadan arXivisual validator + renderer.

Gerçek AI üretimi için `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY` ve `AZURE_OPENAI_DEPLOYMENT` tanımlanır.

## Yerel çalıştırma

```bash
cd services/medical-simulation-engine
cp .env.example .env
docker compose build
docker compose up -d
curl --fail http://127.0.0.1:8002/api/medical/health
```

Ayrıntılı kılavuz: [`END-TO-END-RUNBOOK.md`](END-TO-END-RUNBOOK.md)

## Kullanıcı deneyimi

- `/medikal-simulasyon`: sekiz zorunlu modül, dinamik sanal hasta ve debriefing.
- `/medikal-simulasyon/ai-studio`: klinik olaydan gerçek arXivisual/Manim video üretimi.

## Program kompozisyonu

- `%70`: UÇEP referanslı çekirdek alan
- `%30`: kurumsal özerklik ve yerel program tasarımı

Bu oran ürün tasarım sınırıdır; resmî UÇEP eşlemesi veya akreditasyon beyanı değildir. Kaynak ve uzman onay gereklilikleri `CLINICAL-SOURCE-REGISTER.md` içinde tutulur.

## Production durumu

**NO-GO.** Gerçek hasta verisi, canlı hastane sistemi, biyometri veya bağımsız klinik karar desteği kullanılmaz. Kurumsal kimlik/RLS, denetim izi, akademik kurul onayı, maliyet kotası ve bağımsız güvenlik/tıp eğitimi QA tamamlanmadan production'a alınmaz.
