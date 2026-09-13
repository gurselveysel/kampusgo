from __future__ import annotations

import asyncio
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from .config import settings


class JobStore:
    def __init__(self, directory: Path | None = None) -> None:
        self.directory = directory or settings.jobs_dir
        self.directory.mkdir(parents=True, exist_ok=True)
        self._lock = asyncio.Lock()

    def _path(self, job_id: str) -> Path:
        return self.directory / f"{job_id}.json"

    async def create(self, job_id: str, request: dict[str, Any], engine_mode: str) -> dict[str, Any]:
        now = datetime.now(UTC).isoformat()
        record = {
            "job_id": job_id,
            "status": "queued",
            "progress": 0,
            "current_step": "İş kuyruğa alındı",
            "engine_mode": engine_mode,
            "created_at": now,
            "updated_at": now,
            "error": None,
            "request": request,
            "result": None,
        }
        await self.write(job_id, record)
        return record

    async def write(self, job_id: str, record: dict[str, Any]) -> None:
        async with self._lock:
            path = self._path(job_id)
            tmp = path.with_suffix(".tmp")
            tmp.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
            tmp.replace(path)

    async def update(self, job_id: str, **changes: Any) -> dict[str, Any]:
        async with self._lock:
            path = self._path(job_id)
            if not path.exists():
                raise KeyError(job_id)
            record = json.loads(path.read_text(encoding="utf-8"))
            record.update(changes)
            record["updated_at"] = datetime.now(UTC).isoformat()
            tmp = path.with_suffix(".tmp")
            tmp.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
            tmp.replace(path)
            return record

    async def get(self, job_id: str) -> dict[str, Any] | None:
        path = self._path(job_id)
        if not path.exists():
            return None
        async with self._lock:
            return json.loads(path.read_text(encoding="utf-8"))


job_store = JobStore()
