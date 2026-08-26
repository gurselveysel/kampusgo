"""FastAPI entrypoint for the TEYS/MAMS clinical simulation generation service."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from . import __version__
from .config import Settings, get_settings
from .deterministic import build_deterministic_plan
from .jobs import JobNotFound, JobRegistry
from .schemas import (
    ClinicalScenePlan,
    ClinicalSceneRequest,
    EngineCapabilities,
    EngineHealth,
    EngineMode,
    SceneJob,
)
from .security import reject_phi, require_api_token


settings = get_settings()
registry = JobRegistry(settings)

app = FastAPI(
    title="TEYS/MAMS Medical Simulation Engine",
    version=__version__,
    description=(
        "Structured synthetic clinical scenarios to validated Manim visualizations. "
        "Educational simulation only; not clinical decision support."
    ),
    docs_url="/docs" if not settings.production else None,
    redoc_url="/redoc" if not settings.production else None,
)

if settings.cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["Authorization", "Content-Type"],
    )


def _upstream_commit(settings: Settings) -> str | None:
    path = settings.upstream_root.parents[1] / "UPSTREAM_COMMIT"
    try:
        return path.read_text(encoding="utf-8").strip() or None
    except OSError:
        return None


def capabilities(settings: Settings = settings) -> EngineCapabilities:
    upstream_present = (
        settings.upstream_root.exists()
        and (settings.upstream_root / "agents" / "manim_generator.py").exists()
        and (settings.upstream_root / "rendering" / "__init__.py").exists()
    )
    return EngineCapabilities(
        requested_mode=EngineMode(settings.engine_mode),
        effective_mode=EngineMode(settings.effective_mode),
        upstream_present=upstream_present,
        upstream_commit=_upstream_commit(settings),
        llm_configured=settings.llm_configured,
        renderer_available=settings.renderer_available,
        render_enabled=(
            settings.allow_render
            and settings.effective_mode == "render"
            and settings.renderer_available
        ),
    )


@app.get("/", include_in_schema=False)
async def root() -> dict[str, str]:
    return {
        "service": "TEYS/MAMS Medical Simulation Engine",
        "health": "/health",
        "capabilities": "/v1/capabilities",
    }


@app.get("/health", response_model=EngineHealth)
async def health() -> EngineHealth:
    caps = capabilities()
    checks = {
        "vendored_upstream": caps.upstream_present,
        "clinical_prompt": settings.prompt_path.exists(),
        "llm_provider": caps.llm_configured,
        "manim_binary": caps.renderer_available,
        "render_gate": caps.render_enabled,
        "api_auth_configured": bool(settings.api_token) or not settings.production,
    }
    critical_ok = (
        checks["vendored_upstream"]
        and checks["clinical_prompt"]
        and checks["api_auth_configured"]
    )
    return EngineHealth(
        status="ok" if critical_ok else "degraded",
        timestamp=datetime.now(timezone.utc),
        capabilities=caps,
        checks=checks,
    )


@app.get(
    "/v1/capabilities",
    response_model=EngineCapabilities,
    dependencies=[Depends(require_api_token)],
)
async def get_capabilities() -> EngineCapabilities:
    return capabilities()


@app.post(
    "/v1/scene-plans",
    response_model=ClinicalScenePlan,
    dependencies=[Depends(require_api_token)],
)
async def create_scene_plan(request: ClinicalSceneRequest) -> ClinicalScenePlan:
    reject_phi(request)
    # This endpoint is intentionally deterministic and immediate. The queued job
    # endpoint invokes the configured upstream AI/Manim path.
    return build_deterministic_plan(request)


@app.post(
    "/v1/scene-jobs",
    response_model=SceneJob,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(require_api_token)],
)
async def create_scene_job(
    request: ClinicalSceneRequest,
    background_tasks: BackgroundTasks,
) -> SceneJob:
    reject_phi(request)
    if request.request_render and not settings.allow_render:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Render is disabled. Set MEDICAL_ENGINE_MODE=render and "
                "MEDICAL_ENGINE_ALLOW_RENDER=1 in an isolated worker environment."
            ),
        )
    job = await registry.create(request)
    background_tasks.add_task(registry.execute, job.job_id, request)
    return job


@app.get(
    "/v1/scene-jobs/{job_id}",
    response_model=SceneJob,
    dependencies=[Depends(require_api_token)],
)
async def get_scene_job(job_id: str) -> SceneJob:
    try:
        return await registry.get(job_id)
    except JobNotFound:
        raise HTTPException(status_code=404, detail="Scene job not found") from None


@app.get(
    "/v1/examples/stemi-vf",
    response_model=ClinicalSceneRequest,
    dependencies=[Depends(require_api_token)],
)
async def stemi_vf_example() -> ClinicalSceneRequest:
    """Return a synthetic contract example; values still require local expert approval."""
    return ClinicalSceneRequest.model_validate(
        {
            "scenario_id": "TEYS-ACS-VF-001",
            "scenario_version": "pilot-1.0",
            "module_id": 6,
            "scene_title": "STEMI sonrası ventriküler fibrilasyon ve ekip yanıtı",
            "learning_objective": (
                "Öğrenci klinik kötüleşmeyi erken fark eder, şoklanabilir ritmi tanır, "
                "ekip görevlerini kapalı döngü iletişimle dağıtır ve gecikmenin sonucunu değerlendirir."
            ),
            "synthetic_patient": True,
            "synthetic_patient_id": "SYN-ACS-VF-001",
            "patient_state_before": {
                "heart_rate": 118,
                "systolic_bp": 86,
                "diastolic_bp": 54,
                "spo2": 91,
                "respiratory_rate": 26,
                "temperature_c": 36.7,
                "rhythm": "stemi",
                "consciousness": "Kaygılı, sorulara uygun yanıt veriyor",
                "pain_score": 8,
                "breathing_pattern": "Yüzeyel ve hızlı solunum",
                "clinical_description": "Sentetik hasta soğuk terli, göğüs ağrılı ve hemodinamik olarak instabil görünür.",
            },
            "learner_action": {
                "action_id": "team-defib-closed-loop",
                "category": "team_command",
                "label": "Defibrilatörü hazırlat, kompresyonu başlat ve ritim kontrolünü kapalı döngüyle yönet",
                "rationale": "Şoklanabilir ritimde kesintisiz yüksek kaliteli CPR ve erken defibrilasyon senaryo hedefidir.",
                "timing_seconds": 24,
                "parameters": {"closed_loop": True, "sbar_handoff": True},
            },
            "patient_state_after": {
                "heart_rate": 0,
                "systolic_bp": 0,
                "diastolic_bp": 0,
                "spo2": 78,
                "respiratory_rate": 0,
                "temperature_c": 36.7,
                "rhythm": "ventricular_fibrillation",
                "consciousness": "Yanıtsız",
                "pain_score": 0,
                "breathing_pattern": "Normal solunum yok",
                "clinical_description": "Sentetik senaryoda hasta ventriküler fibrilasyon arrestine ilerler ve ekip resüsitasyonuna ihtiyaç duyar.",
            },
            "clinical_rationale": (
                "Bu geçiş yalnızca onaylı sentetik senaryo akışını görselleştirir. "
                "Animasyon, gecikme süresi ile monitör ve ekip yanıtı arasındaki eğitimsel ilişkiyi gösterir."
            ),
            "visual_focus": "team_coordination",
            "voiceover_language": "tr",
            "duration_seconds": 38,
            "safety_constraints": [
                "Gerçek hasta verisi veya gerçek kişi benzerliği kullanma",
                "Doz, enerji veya klinik protokol ayrıntısını uzman onaylı girdinin dışına çıkarma",
                "Çıktıyı klinik karar desteği olarak sunma",
            ],
            "source_references": [
                {
                    "source_id": "UCE-LOCAL-MAP-001",
                    "title": "Kurumsal UÇEP eşleştirme ve resüsitasyon senaryo kurulu kaydı",
                    "version": "pilot-2026",
                    "url": None,
                    "approved_for_scenario": True,
                    "approval_note": "Yerel eğitim kurulu doğrulaması gerektiren pilot kaynak kaydı",
                }
            ],
            "expert_approval_reference": "TEYS-KLINIK-KURUL-PILOT-001",
            "ucep_alignment_codes": ["UÇEP-2020-kurumsal-esleme-bekliyor"],
            "horizontal_integration_tags": ["kardiyoloji", "acil-tıp", "farmakoloji", "iletişim"],
            "vertical_integration_tags": ["temel-fizyoloji", "klinik-yorum", "acil-uygulama", "intörnlük"],
            "request_render": False,
        }
    )
