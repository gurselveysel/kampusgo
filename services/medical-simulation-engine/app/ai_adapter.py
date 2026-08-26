"""Medical storyboard adapter backed by the vendored arXivisual LLM layer."""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

from .models import MedicalStoryboard, MedicalStoryboardRequest, StoryboardScene
from .security import require_synthetic


VENDOR_ROOT = Path(
    os.getenv(
        "TEYS_UPSTREAM_BACKEND",
        str(Path(__file__).resolve().parents[2] / "visual-lab" / "upstream" / "arxivisual" / "backend"),
    )
)
if str(VENDOR_ROOT) not in sys.path:
    sys.path.insert(0, str(VENDOR_ROOT))


def ai_provider_configured() -> bool:
    return bool(
        (os.getenv("AZURE_OPENAI_API_KEY") and os.getenv("AZURE_OPENAI_ENDPOINT"))
        or os.getenv("DEDALUS_API_KEY")
    )


def _fallback_storyboard(request: MedicalStoryboardRequest) -> MedicalStoryboard:
    scene_duration = max(4, request.duration_seconds // 4)
    scenes = [
        StoryboardScene(
            order=1,
            title="Gözlemle",
            duration_seconds=scene_duration,
            visual_description="Sentetik hasta, solunum eforu, cilt bulguları ve canlı vital monitörü birlikte görünür.",
            patient_state="Ajite, dispneik, hipotansif ve yaygın ürtikerli.",
            monitor_state="HR 128, BP 78/44, SpO₂ 86, RR 32; sinüs taşikardisi.",
            learner_decision="ABCDE yaklaşımıyla kritik sorunları tanımla.",
            narration="Klinik tabloyu tek bir bulguya indirgeme; hava yolu, solunum ve dolaşımı aynı anda değerlendir.",
            clinical_safety_note="Bu sahne yalnızca sentetik eğitim senaryosudur.",
        ),
        StoryboardScene(
            order=2,
            title="Düşün ve önceliklendir",
            duration_seconds=scene_duration,
            visual_description="Anafilaksi ipuçları klinik akıl yürütme haritasında ağırlıklandırılır.",
            patient_state="Stridor ve bronkospazm sürüyor; bilinç dalgalanıyor.",
            monitor_state="Kan basıncı ve SpO₂ aşağı yönlü trend gösteriyor.",
            learner_decision="Adrenalini ikincil ilaç ve tetkiklerden önce konumlandır.",
            narration="Hipotansiyon, solunum sıkıntısı ve ürtiker birlikteliği zaman kritik anafilaksiyi destekler.",
            clinical_safety_note="Gerçek klinik bakım için yerel protokol ve yetkili ekip gerekir.",
        ),
        StoryboardScene(
            order=3,
            title="Uygula ve sonucu gör",
            duration_seconds=scene_duration,
            visual_description="IM adrenalin, yüksek akım oksijen ve sıvı sonrası vital eğriler dinamik olarak iyileşir.",
            patient_state="Konuşma uzuyor, stridor azalıyor, perfüzyon düzeliyor.",
            monitor_state="BP 101/58, SpO₂ 94, HR 112; trend stabilizasyona dönüyor.",
            learner_decision="Ekip görevlerini kapalı döngü iletişimle tamamla.",
            narration="Doğru ve zamanında müdahale, hastanın fizyolojik yanıtında doğrudan görünür hâle gelir.",
            clinical_safety_note="İlaç dozu ve uygulama yolu eğitim senaryosu bağlamındadır.",
        ),
        StoryboardScene(
            order=4,
            title="Değerlendir ve yeniden dene",
            duration_seconds=max(4, request.duration_seconds - scene_duration * 3),
            visual_description="Karar zaman çizelgesi, kritik hata kapıları ve debriefing metrikleri açılır.",
            patient_state="Stabil ancak bifazik reaksiyon açısından izlem gerektiriyor.",
            monitor_state="Vital trendler stabil; alarm eşikleri normale yaklaşıyor.",
            learner_decision="Ne yaptığını, ne olabileceğini ve bir sonraki denemede neyi değiştireceğini açıkla.",
            narration="Simülasyon, toplam puandan çok kararların hastaya nasıl yansıdığını görünür kılar.",
            clinical_safety_note="Nihai eğitim değerlendirmesi eğitici onayı gerektirir.",
        ),
    ]
    return MedicalStoryboard(
        topic=request.topic,
        module_id=request.module_id,
        title=f"{request.topic} — Klinik Görsel Hikâye",
        total_duration_seconds=sum(scene.duration_seconds for scene in scenes),
        visual_focus=request.visual_focus,
        learning_objectives=request.learning_objectives,
        ucep_alignment=request.ucep_alignment,
        scenes=scenes,
        source="deterministic-fallback",
    )


def _extract_json(text: str) -> dict:
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    payload = fenced.group(1) if fenced else text
    start = payload.find("{")
    end = payload.rfind("}")
    if start < 0 or end < start:
        raise ValueError("The model did not return a JSON object")
    return json.loads(payload[start : end + 1])


async def generate_storyboard(request: MedicalStoryboardRequest) -> MedicalStoryboard:
    require_synthetic(request.synthetic_only)
    fallback = _fallback_storyboard(request)
    if not ai_provider_configured():
        return fallback

    try:
        from agents.base import call_llm

        schema = MedicalStoryboard.model_json_schema()
        prompt = f"""
Aşağıdaki sentetik tıp eğitimi konusu için Türkçe, klinik olarak güvenli ve görsel açıdan uygulanabilir bir Manim storyboard'u üret.

Konu: {request.topic}
Modül: {request.module_id}
Hedef kitle: {request.audience}
Süre: {request.duration_seconds} saniye
Görsel odak: {request.visual_focus}
Öğrenme çıktıları: {json.dumps(request.learning_objectives, ensure_ascii=False)}
UÇEP eşleşmeleri: {json.dumps(request.ucep_alignment, ensure_ascii=False)}

Kurallar:
- Yalnız sentetik eğitim vakası kullan.
- Gerçek kişi, hasta adı, kimlik veya klinik bakım talimatı üretme.
- Tam 4 sahne oluştur.
- Animasyon her sahnede klinik durum veya karar sonucunu görünür kılsın; dekoratif hareket kullanma.
- Toplam süre 15-60 saniye arasında olsun.
- Yanıt yalnızca aşağıdaki JSON şemasına uyan tek JSON nesnesi olsun.
- source alanını "upstream-ai" yap.
- requires_educator_review ve synthetic_only alanlarını true yap.

JSON schema:
{json.dumps(schema, ensure_ascii=False)}
"""
        system = (
            "Sen tıp eğitimi, klinik simülasyon, hasta güvenliği ve öğretim tasarımı uzmanısın. "
            "Çıktın klinik bakım önerisi değil, kontrollü eğitim materyalidir."
        )
        text = await call_llm(
            prompt=prompt,
            system_prompt=system,
            max_tokens=5000,
            name="teys-medical-storyboard",
        )
        data = _extract_json(text)
        data["source"] = "upstream-ai"
        data["synthetic_only"] = True
        data["requires_educator_review"] = True
        return MedicalStoryboard.model_validate(data)
    except Exception:
        return fallback
