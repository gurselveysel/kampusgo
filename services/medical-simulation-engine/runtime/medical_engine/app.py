from __future__ import annotations

import asyncio
import hmac
import logging
import os
import shutil
import time
import uuid
from collections import defaultdict, deque
from datetime import datetime
from typing import Any

from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

load_dotenv()

from . import __version__
from .config import settings
from .pipeline import generate_and_render, provider_available, selected_engine_mode
from .schemas import JobPublic, JobStatus, MedicalSceneRequest, RenderResult
from .store import job_store

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger("teys.medical_engine")

settings.ensure_directories()
_job_semaphore = asyncio.Semaphore(settings.max_concurrent_jobs)
_request_log: dict[str, deque[float]] = defaultdict(deque)


def _client_key(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "").split(",", 1)[0].strip()
    return forwarded or (request.client.host if request.client else "unknown")


def _check_rate_limit(request: Request) -> None:
    now = time.time()
    bucket = _request_log[_client_key(request)]
    while bucket and bucket[0] < now - 3600:
        bucket.popleft()
    if len(bucket) >= settings.job_limit_per_hour:
        raise HTTPException(
            status_code=429,
            detail="Controlled-pilot hourly job limit reached.",
            headers={"Retry-After": "3600"},
        )
    bucket.append(now)


def _require_key(request: Request) -> None:
    if not settings.api_key or len(settings.api_key) < 32:
        raise HTTPException(status_code=503, detail="TEYS engine authentication is not configured.")
    supplied = request.headers.get("x-teys-engine-key", "")
    if not supplied or not hmac.compare_digest(supplied, settings.api_key):
        raise HTTPException(status_code=401, detail="Unauthorized")


def _public_job(record: dict[str, Any]) -> JobPublic:
    return JobPublic(
        job_id=record["job_id"],
        status=record["status"],
        progress=record["progress"],
        current_step=record["current_step"],
        engine_mode=record["engine_mode"],
        created_at=datetime.fromisoformat(record["created_at"]),
        updated_at=datetime.fromisoformat(record["updated_at"]),
        error=record.get("error"),
    )


async def _execute_job(job_id: str, request: MedicalSceneRequest) -> None:
    async with _job_semaphore:
        try:
            await job_store.update(
                job_id,
                status=JobStatus.GENERATING.value,
                progress=18,
                current_step="arXivisual klinik sahne planı hazırlanıyor",
            )
            await asyncio.sleep(0)
            await job_store.update(
                job_id,
                status=JobStatus.VALIDATING.value,
                progress=46,
                current_step="Kod, yerleşim ve çalışma güvenliği doğrulanıyor",
            )
            result = await generate_and_render(request, job_id)
            await job_store.update(
                job_id,
                status=JobStatus.RENDERING.value,
                progress=84,
                current_step="Manim videosu kaydediliyor ve bütünlük özeti çıkarılıyor",
            )
            await job_store.update(
                job_id,
                status=JobStatus.COMPLETED.value,
                progress=100,
                current_step="Klinik görsel anlatım hazır",
                engine_mode=result.engine_mode,
                result=result.model_dump(mode="json"),
            )
        except Exception as exc:
            logger.exception("Medical scene job %s failed", job_id)
            await job_store.update(
                job_id,
                status=JobStatus.FAILED.value,
                progress=100,
                current_step="Üretim tamamlanamadı",
                error=f"{type(exc).__name__}: {str(exc)[:1200]}",
            )


app = FastAPI(
    title="TEYS / MAMS Medical Simulation Engine",
    description="arXivisual tabanlı, sentetik ve uzman-onaylı klinik sahne üretim servisi.",
    version=__version__,
    docs_url="/docs" if settings.docs_enabled else None,
    redoc_url="/redoc" if settings.docs_enabled else None,
    openapi_url="/openapi.json" if settings.docs_enabled else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Accept", "Content-Type", "X-TEYS-Engine-Key"],
)


@app.middleware("http")
async def security_boundary(request: Request, call_next):
    if request.method in {"POST", "PUT", "PATCH"}:
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                if int(content_length) > settings.max_request_bytes:
                    return JSONResponse(status_code=413, content={"detail": "Request body is too large."})
            except ValueError:
                return JSONResponse(status_code=400, content={"detail": "Invalid Content-Length."})
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response


@app.get("/api/medical/health")
async def health() -> dict[str, Any]:
    return {
        "service": "teys-medical-simulation-engine",
        "version": __version__,
        "status": "ready",
        "mode": settings.ai_mode,
        "aiProviderConfigured": provider_available(),
        "manimExecutable": shutil.which(os.getenv("MANIM_EXECUTABLE", "manim")) is not None,
        "maxConcurrentJobs": settings.max_concurrent_jobs,
        "jobLimitPerHour": settings.job_limit_per_hour,
        "rawCodeEndpoint": False,
        "syntheticPatientOnly": True,
        "productionAllowed": False,
    }


@app.get("/api/medical/catalog")
async def catalog(request: Request) -> dict[str, Any]:
    _require_key(request)
    return {
        "modules": [
            {"id": 1, "title": "Sanal Hasta"},
            {"id": 2, "title": "Olguya Dayalı Öğrenme"},
            {"id": 3, "title": "Klinik Akıl Yürütme"},
            {"id": 4, "title": "Tanı ve Tetkik"},
            {"id": 5, "title": "Tedavi ve Müdahale"},
            {"id": 6, "title": "Acil Durum Simülasyonları"},
            {"id": 7, "title": "Ekip Yönetimi & Klinik Liderlik"},
            {"id": 8, "title": "Entegre Klinik Simülasyon"},
        ],
        "curriculumComposition": {"ucepReferencedCore": 70, "institutionalAutonomy": 30},
        "engine": "arXivisual + TEYS clinical safety overlay",
        "productionAllowed": False,
    }


@app.post("/api/medical/jobs", response_model=JobPublic, status_code=202)
async def create_job(payload: MedicalSceneRequest, request: Request, background_tasks: BackgroundTasks) -> JobPublic:
    _require_key(request)
    _check_rate_limit(request)
    job_id = f"med_{uuid.uuid4().hex[:16]}"
    engine_mode = selected_engine_mode(payload)
    record = await job_store.create(job_id, payload.model_dump(mode="json"), engine_mode)
    background_tasks.add_task(_execute_job, job_id, payload)
    return _public_job(record)


@app.get("/api/medical/jobs/{job_id}", response_model=JobPublic)
async def get_job(job_id: str, request: Request) -> JobPublic:
    _require_key(request)
    if not job_id.startswith("med_") or len(job_id) > 40:
        raise HTTPException(status_code=400, detail="Invalid job ID.")
    record = await job_store.get(job_id)
    if not record:
        raise HTTPException(status_code=404, detail="Job not found.")
    return _public_job(record)


@app.get("/api/medical/jobs/{job_id}/result", response_model=RenderResult)
async def get_result(job_id: str, request: Request) -> RenderResult:
    _require_key(request)
    record = await job_store.get(job_id)
    if not record:
        raise HTTPException(status_code=404, detail="Job not found.")
    if record["status"] != JobStatus.COMPLETED.value or not record.get("result"):
        raise HTTPException(status_code=409, detail="Job result is not ready.")
    return RenderResult.model_validate(record["result"])


@app.get("/api/medical/media/{asset_id}")
async def get_media(asset_id: str, request: Request):
    _require_key(request)
    if not asset_id.startswith("med_") or not asset_id.endswith(".mp4"):
        raise HTTPException(status_code=400, detail="Invalid asset ID.")
    if any(char not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_.-" for char in asset_id):
        raise HTTPException(status_code=400, detail="Invalid asset ID.")
    path = (settings.media_dir / asset_id).resolve()
    if path.parent != settings.media_dir.resolve() or not path.is_file():
        raise HTTPException(status_code=404, detail="Media not found.")
    return FileResponse(path, media_type="video/mp4", filename=asset_id)


@app.get("/")
async def root() -> dict[str, Any]:
    return {
        "service": "teys-medical-simulation-engine",
        "status": "controlled_pilot",
        "health": "/api/medical/health",
        "productionAllowed": False,
    }
