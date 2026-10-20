from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


def env_flag(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def csv_env(name: str, default: str = "") -> list[str]:
    return [part.strip() for part in os.getenv(name, default).split(",") if part.strip()]


@dataclass(frozen=True)
class Settings:
    environment: str = os.getenv("ENVIRONMENT", "development").strip().lower()
    api_key: str = os.getenv("TEYS_ENGINE_API_KEY", "").strip()
    data_dir: Path = Path(os.getenv("TEYS_ENGINE_DATA_DIR", "/data"))
    media_dir: Path = Path(os.getenv("MEDIA_DIR", "/data/media"))
    jobs_dir: Path = Path(os.getenv("TEYS_ENGINE_JOBS_DIR", "/data/jobs"))
    ai_mode: str = os.getenv("MEDICAL_AI_MODE", "auto").strip().lower()
    voiceover_enabled: bool = env_flag("MEDICAL_VOICEOVER_ENABLED", False)
    tts_service: str = os.getenv("VOICEOVER_TTS_SERVICE", "gtts").strip().lower()
    voice_name: str = os.getenv("VOICEOVER_VOICE_NAME", "nova").strip()
    render_quality: str = os.getenv("MEDICAL_RENDER_QUALITY", "low_quality").strip()
    max_request_bytes: int = max(4096, int(os.getenv("TEYS_ENGINE_MAX_REQUEST_BYTES", "262144")))
    job_limit_per_hour: int = max(1, int(os.getenv("TEYS_ENGINE_JOB_LIMIT_PER_HOUR", "3")))
    max_concurrent_jobs: int = max(1, int(os.getenv("TEYS_ENGINE_MAX_CONCURRENT_JOBS", "1")))
    cors_origins: tuple[str, ...] = tuple(
        csv_env(
            "CORS_ALLOWED_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000",
        )
    )
    docs_enabled: bool = env_flag("TEYS_ENGINE_DOCS_ENABLED", os.getenv("ENVIRONMENT") != "production")

    def ensure_directories(self) -> None:
        for directory in (self.data_dir, self.media_dir, self.jobs_dir):
            directory.mkdir(parents=True, exist_ok=True)


settings = Settings()
