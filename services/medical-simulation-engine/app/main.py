"""FastAPI entrypoint for the TEYS Medical Simulation Engine."""

from __future__ import annotations

import asyncio
import os
import shutil
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from . import __version__
from .ai_adapter import ai_provider_configured, generate_storyboard
from .curriculum import build_curriculum
from .engine import SimulationEngine
from .manim_adapter import (
    VENDOR_ROOT,
    generated_code_execution_enabled,
    generate_manim_code,
    manim_available,
    render_safe_monitor,
)
from .models import (
    CurriculumResponse,
    DebriefReport,
    HealthResponse,
    ManimCodeRequest,
    ManimCodeResponse,
    MedicalStoryboard,
    MedicalStoryboardRequest,
    MonitorRenderRequest,
    MonitorRenderResponse,
    ScenarioSummary,
    SessionActionRequest,
    SessionActionResponse,
    SessionStartRequest,
    SessionView,
)
from .scenarios import list_scenarios
from .security import EDUCATIONAL_DISCLAIMER


app = FastAPI(
    title="TEYS Medical Simulation Engine",
    version=__version__,
    description=(
        "Synthetic, prerequisite-gated medical education simulation with an approved "
        "arXivisual Manim/AI pipeline adaptation. Not for clinical care."
    ),
)

origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ALLOW_ORIGINS",
        "http://localhost:3000,https://kampusgo.uzemgo.com",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

engine = SimulationEngine()


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    upstream_present = (VENDOR_ROOT / "agents" / "manim_generator.py").exists()
    manim_cli = manim_available()
    status = "ok" if upstream_present else "degraded"
    return HealthResponse(
        status=status,
        service="TEYS Medical Simulation Engine",
        version=__version__,
        upstream_backend_present=upstream_present,
        ai_provider_configured=ai_provider_configured(),
        manim_available=manim_cli,
        render_generated_code_enabled=generated_code_execution_enabled(),
        details={
            "vendor_root": str(VENDOR_ROOT),
            "manim_cli": shutil.which("manim"),
            "educational_disclaimer": EDUCATIONAL_DISCLAIMER,
        },
    )


@app.get("/api/v1/curriculum", response_model=CurriculumResponse)
def curriculum() -> CurriculumResponse:
    return build_curriculum(
        completed_modules=[1, 2, 3, 4, 5],
        competency_scores={1: 86, 2: 84, 3: 82, 4: 80, 5: 79, 6: 42},
        active_module_id=6,
    )


@app.get("/api/v1/scenarios", response_model=list[ScenarioSummary])
def scenarios() -> list[ScenarioSummary]:
    return list_scenarios()


@app.post("/api/v1/sessions", response_model=SessionView, status_code=201)
def start_session(request: SessionStartRequest) -> SessionView:
    try:
        return engine.start_session(request)
    except (ValueError, PermissionError, KeyError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.get("/api/v1/sessions/{session_id}", response_model=SessionView)
def get_session(session_id: str) -> SessionView:
    try:
        return engine.get_session(session_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post(
    "/api/v1/sessions/{session_id}/actions",
    response_model=SessionActionResponse,
)
def apply_action(session_id: str, request: SessionActionRequest) -> SessionActionResponse:
    try:
        return engine.apply_action(session_id, request)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@app.get("/api/v1/sessions/{session_id}/debrief", response_model=DebriefReport)
def debrief(session_id: str) -> DebriefReport:
    try:
        return engine.debrief(session_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post(
    "/api/v1/visualizations/storyboard",
    response_model=MedicalStoryboard,
)
async def storyboard(request: MedicalStoryboardRequest) -> MedicalStoryboard:
    try:
        return await generate_storyboard(request)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post(
    "/api/v1/visualizations/manim-code",
    response_model=ManimCodeResponse,
)
async def manim_code(request: ManimCodeRequest) -> ManimCodeResponse:
    try:
        return await generate_manim_code(request)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post(
    "/api/v1/visualizations/render-monitor",
    response_model=MonitorRenderResponse,
)
async def render_monitor(request: MonitorRenderRequest) -> MonitorRenderResponse:
    try:
        return await asyncio.to_thread(render_safe_monitor, request)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.get("/")
def root() -> dict[str, str]:
    return {
        "service": "TEYS Medical Simulation Engine",
        "status": "controlled-pilot",
        "docs": "/docs",
        "warning": EDUCATIONAL_DISCLAIMER,
    }
