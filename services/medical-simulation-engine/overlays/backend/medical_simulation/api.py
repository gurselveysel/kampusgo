"""Authenticated controlled-pilot API for medical scene jobs."""

from __future__ import annotations

import asyncio
import logging
import os
import re
import secrets
from collections import deque
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Header, HTTPException, Request
from fastapi.responses import FileResponse, RedirectResponse

from rendering import get_video_path, get_video_url

from .pipeline import generate_and_render_scene
from .schemas import CreateMedicalScenePayload, JobAccepted, JobState


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/medical", tags=["medical-simulation"])

JOB_ID_PATTERN = re.compile(r"^medjob_[0-9a-f]{16}$")
VIDEO_ID_PATTERN = re.compile(r"^medviz_[0-9a-f]{16}$")
JOB_DIR = Path(os.getenv("MEDICAL_SIMULATION_JOB_DIR", "/data/jobs"))
JOB_DIR.mkdir(parents=True, exist_ok=True)
MAX_JOBS_PER_WINDOW = max(1, int(os.getenv("MEDICAL_SIMULATION_MAX_JOBS_PER_WINDOW", "3")))
RATE_WINDOW_SECONDS = max(60, int(os.getenv("MEDICAL_SIMULATION_RATE_WINDOW_SECONDS", "3600")))
RENDER_CONCURRENCY = max(1, int(os.getenv("MEDICAL_SIMULATION_RENDER_CONCURRENCY", "1")))
_job_lock = asyncio.Lock()
_render_slots = asyncio.Semaphore(RENDER_CONCURRENCY)
_accepted_at: deque[float] = deque()
_jobs: dict[str, JobState] = {}
_tasks: set[asyncio.Task] = set()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _job_path(job_id: str) -> Path:
    return JOB_DIR / f"{job_id}.json"


def _persist(job: JobState) -> None:
    target = _job_path(job.job_id)
    temporary = target.with_suffix(".tmp")
    temporary.write_text(job.model_dump_json(indent=2), encoding="utf-8")
    temporary.replace(target)


def _load(job_id: str) -> JobState | None:
    current = _jobs.get(job_id)
    if current:
        return current
    target = _job_path(job_id)
    if not target.exists():
        return None
    try:
        loaded = JobState.model_validate_json(target.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        logger.exception("Could not load medical scene job %s", job_id)
        return None
    _jobs[job_id] = loaded
    return loaded


def _update(job_id: str, status: str, progress: int, step: str) -> None:
    job = _jobs[job_id]
    job.status = status
    job.progress = progress
    job.current_step = step
    job.updated_at = _now()
    _persist(job)


def _rate_limit() -> None:
    now = asyncio.get_running_loop().time()
    cutoff = now - RATE_WINDOW_SECONDS
    while _accepted_at and _accepted_at[0] < cutoff:
        _accepted_at.popleft()
    if len(_accepted_at) >= MAX_JOBS_PER_WINDOW:
        raise HTTPException(
            status_code=429,
            detail="Controlled-pilot generation quota has been reached. Try again later.",
        )
    _accepted_at.append(now)


async def _run_job(job_id: str, payload: CreateMedicalScenePayload) -> None:
    try:
        async with _render_slots:
            output = await generate_and_render_scene(
                scene=payload.scene,
                job_id=job_id,
                quality=payload.quality,
                voiceover_enabled=payload.voiceover_enabled,
                update=lambda status, progress, step: _update(
                    job_id, status, progress, step
                ),
            )
        job = _jobs[job_id]
        job.output = output
        job.status = "completed"
        job.progress = 100
        job.current_step = "completed"
        job.updated_at = _now()
        _persist(job)
    except Exception as exc:
        logger.exception("Medical scene job %s failed", job_id)
        job = _jobs[job_id]
        job.status = "failed"
        job.progress = min(job.progress, 99)
        job.current_step = "failed"
        job.error_code = type(exc).__name__[:80]
        job.error = "Scene generation failed. Operator logs contain the diagnostic detail."
        job.updated_at = _now()
        _persist(job)


def _supervise(task: asyncio.Task) -> None:
    _tasks.add(task)

    def done(finished: asyncio.Task) -> None:
        _tasks.discard(finished)
        if not finished.cancelled() and finished.exception():
            logger.error("Unsupervised medical scene task failure", exc_info=finished.exception())

    task.add_done_callback(done)


@router.post("/scenes", response_model=JobAccepted, status_code=202)
async def create_scene(
    payload: CreateMedicalScenePayload,
    request: Request,
    x_expert_approval_confirmed: str | None = Header(default=None),
):
    if (x_expert_approval_confirmed or "").strip().lower() != "true":
        raise HTTPException(
            status_code=428,
            detail="Explicit expert-approval confirmation is required.",
        )
    if not payload.scene.expert_approval_reference:
        raise HTTPException(status_code=422, detail="Expert approval reference is required.")

    _rate_limit()
    job_id = f"medjob_{secrets.token_hex(8)}"
    created_at = _now()
    job = JobState(
        job_id=job_id,
        status="queued",
        progress=5,
        current_step="queued",
        created_at=created_at,
        updated_at=created_at,
        scene=payload.scene,
    )
    async with _job_lock:
        _jobs[job_id] = job
        _persist(job)

    _supervise(asyncio.create_task(_run_job(job_id, payload)))
    return JobAccepted(
        job_id=job_id,
        status="queued",
        status_url=str(request.url_for("get_scene_job", job_id=job_id)),
    )


@router.get("/scenes/{job_id}", response_model=JobState, name="get_scene_job")
async def get_scene_job(job_id: str):
    if not JOB_ID_PATTERN.fullmatch(job_id):
        raise HTTPException(status_code=400, detail="Invalid medical scene job ID.")
    job = _load(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Medical scene job not found.")
    return job


@router.get("/video/{video_id}")
async def get_medical_video(video_id: str):
    if not VIDEO_ID_PATTERN.fullmatch(video_id):
        raise HTTPException(status_code=400, detail="Invalid medical scene video ID.")
    path = get_video_path(video_id)
    if path and path.exists():
        return FileResponse(
            path=str(path),
            media_type="video/mp4",
            headers={"Cache-Control": "private, no-store"},
        )
    url = get_video_url(video_id)
    if url and url.startswith("https://"):
        return RedirectResponse(url=url, status_code=302)
    raise HTTPException(status_code=404, detail="Medical scene video not found.")
