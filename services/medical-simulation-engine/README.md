# TEYS Medical Simulation Engine

**Medical Education Management System (MAMS) / Tıp Eğitimi Yönetim Sistemi (TEYS)** için sentetik, ön koşullu ve sonuç odaklı klinik simülasyon servisi.

> **KONTROLLÜ PİLOT — Bu servis gerçek hasta bakımı, tanı, tedavi veya klinik karar desteği amacıyla kullanılamaz. Kimliği belirlenebilir hasta verisi kabul etmez.**

## Ne çalışıyor?

- Sekiz modüllü zorunlu ilerleme ve yeterlilik kapıları
- Portföy düzeyinde tam `%70 UÇEP / %30 kurumsal özerklik` doğrulaması
- Yatay ve dikey entegrasyon haritası
- Dinamik sentetik anafilaksi senaryosu
- Zaman, vital bulgular, klinik yanıt, kritik hata ve ekip iletişimi kaydı
- Ayrıntılı debriefing ve karar zaman çizelgesi
- Onaylı `arXivisual` backend kaynak koduna bağlanan gerçek LLM/Manim adaptörü
- AI anahtarı yokken güvenli, deterministik storyboard ve Manim kodu fallback'i
- Yalnız önceden onaylanmış sahneyi çalıştıran güvenli Manim render endpoint'i

## Upstream motor

Onaylanan kaynak, şu dizinde eksiksiz vendor edilmiştir:

```text
services/visual-lab/upstream/arxivisual/backend/
```

AI ve Manim adaptörleri bu kaynak içindeki `agents.base`, `agents.manim_generator`, `agents.code_validator` ve `models.generation` bileşenlerini doğrudan kullanır. Tam kaynak commit'i `UPSTREAM_COMMIT` dosyasında tutulur.

## Çalıştırma

```bash
cd services/medical-simulation-engine
python -m venv .venv
source .venv/bin/activate
pip install -e .
cp .env.example .env
uvicorn app.main:app --reload --port 8080
```

API dokümantasyonu:

```text
http://localhost:8080/docs
```

Docker:

```bash
cd ../..
docker build -f services/medical-simulation-engine/Dockerfile -t teys-medical-simulation .
docker run --rm -p 8080:8080 --env-file services/medical-simulation-engine/.env teys-medical-simulation
```

## Gerçek AI ve Manim

Azure OpenAI kullanımı için:

```env
LLM_PROVIDER=azure
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_ENDPOINT=https://...openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-5
```

Manim render, Docker imajında FFmpeg, Cairo, Pango ve LaTeX bağımlılıklarıyla çalışır. Ham kullanıcı Python kodu API üzerinden kabul edilmez. AI tarafından üretilen kodun çalıştırılması varsayılan olarak kapalıdır:

```env
ALLOW_GENERATED_MANIM_EXECUTION=0
```

Kontrollü pilotta `render-monitor` endpoint'i yalnız `app/scenes/clinical_monitor.py` içindeki önceden onaylanmış sahneyi çalıştırır.

## Temel endpoint'ler

- `GET /health`
- `GET /api/v1/curriculum`
- `GET /api/v1/scenarios`
- `POST /api/v1/sessions`
- `POST /api/v1/sessions/{id}/actions`
- `GET /api/v1/sessions/{id}/debrief`
- `POST /api/v1/visualizations/storyboard`
- `POST /api/v1/visualizations/manim-code`
- `POST /api/v1/visualizations/render-monitor`

## Test

```bash
pytest -q
```
