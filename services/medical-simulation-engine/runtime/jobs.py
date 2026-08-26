"""Bounded in-memory job registry for the controlled pilot.

A durable queue/database is deliberately kept as a deployment gate. The API
contract is stable so the registry can later be replaced by Temporal/Postgres
without changing the frontend.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from uuid import uuid4

from .config import Settings
from .schemas import ClinicalSceneRequest, EngineMode, JobStatus, SceneJob
from .upstream_adapter import ArxivisualMedicalAdapter


class JobNotFound(KeyError):
    pass


class JobRegistry:
    def __init__(self, settings: Settings):
        self.settings = settings
        self._jobs: dict[str, SceneJob] = {}
        self._lock = asyncio.Lock()
        self._semaphore = asyncio.Semaphore(settings.max_parallel_jobs)
        self._adapter = ArxivisualMedicalAdapter(settings)

    async def create(self, request: ClinicalSceneRequest) -> SceneJob:
        job_id = "medsim_" + uuid4().hex
        job = SceneJob.new(
            job_id,
            request,
            EngineMode(self.settings.effective_mode),
        )
        async with self._lock:
            self._jobs[job_id] = job
        return job.model_copy(deep=True)

    async def get(self, job_id: str) -> SceneJob:
        async with self._lock:
            job = self._jobs.get(job_id)
            if job is None:
                raise JobNotFound(job_id)
            return job.model_copy(deep=True)

    async def _patch(self, job_id: str, **changes: object) -> None:
        async with self._lock:
            current = self._jobs[job_id]
            changes["updated_at"] = datetime.now(timezone.utc)
            self._jobs[job_id] = current.model_copy(update=changes)

    async def execute(self, job_id: str, request: ClinicalSceneRequest) -> None:
        async with self._semaphore:
            try:
                await self._patch(job_id, status=JobStatus.PLANNING, progress=0.12)
                # Planning, generation and validation occur within the upstream adapter;
                # progress states remain honest at API boundaries.
                await self._patch(job_id, status=JobStatus.GENERATING, progress=0.32)
                result = await self._adapter.run(request)
                await self._patch(job_id, status=JobStatus.VALIDATING, progress=0.76)

                if request.request_render and self.settings.effective_mode == "render":
                    await self._patch(job_id, status=JobStatus.RENDERING, progress=0.88)

                await self._patch(
                    job_id,
                    status=JobStatus.COMPLETED,
                    progress=1.0,
                    plan=result.plan,
                    artifact=result.artifact,
                    error=None,
                )
            except Exception as exc:
                await self._patch(
                    job_id,
                    status=JobStatus.FAILED,
                    progress=1.0,
                    error=f"{type(exc).__name__}: {exc}",
                )
