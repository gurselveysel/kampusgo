"""Runtime configuration for the TEYS/MAMS medical simulation engine."""

from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path


SERVICE_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_UPSTREAM_ROOT = SERVICE_ROOT / "vendor" / "arxivisual-backend"


def _truthy(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _csv(name: str, default: str = "") -> tuple[str, ...]:
    raw = os.getenv(name, default)
    return tuple(item.strip() for item in raw.split(",") if item.strip())


@dataclass(frozen=True, slots=True)
class Settings:
    """Immutable settings resolved from environment variables."""

    environment: str
    engine_mode: str
    api_token: str | None
    allow_render: bool
    enable_import_test: bool
    max_retries: int
    render_quality: str
    tts_service: str
    voice_name: str
    upstream_root: Path
    prompt_path: Path
    cors_origins: tuple[str, ...]
    max_parallel_jobs: int

    @property
    def production(self) -> bool:
        return self.environment.lower() == "production"

    @property
    def llm_configured(self) -> bool:
        azure = bool(
            os.getenv("AZURE_OPENAI_API_KEY")
            and os.getenv("AZURE_OPENAI_ENDPOINT")
        )
        dedalus = bool(os.getenv("DEDALUS_API_KEY"))
        return azure or dedalus

    @property
    def renderer_available(self) -> bool:
        # Deliberately resolved lazily to keep preview/CI mode lightweight.
        import shutil

        return shutil.which("manim") is not None

    @property
    def effective_mode(self) -> str:
        """Return the mode that can actually run with the current environment."""
        requested = self.engine_mode.lower()
        if requested == "render":
            if self.allow_render and self.llm_configured and self.renderer_available:
                return "render"
            if self.llm_configured:
                return "ai"
            return "preview"
        if requested == "ai":
            return "ai" if self.llm_configured else "preview"
        return "preview"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    mode = os.getenv("MEDICAL_ENGINE_MODE", "preview").strip().lower()
    if mode not in {"preview", "ai", "render"}:
        raise RuntimeError(
            "MEDICAL_ENGINE_MODE must be one of: preview, ai, render"
        )

    quality = os.getenv("MEDICAL_ENGINE_RENDER_QUALITY", "low_quality").strip()
    if quality not in {"low_quality", "medium_quality", "high_quality"}:
        raise RuntimeError(
            "MEDICAL_ENGINE_RENDER_QUALITY must be low_quality, medium_quality or high_quality"
        )

    upstream_root = Path(
        os.getenv("MEDICAL_ENGINE_UPSTREAM_ROOT", str(DEFAULT_UPSTREAM_ROOT))
    ).resolve()
    prompt_path = Path(
        os.getenv(
            "MEDICAL_ENGINE_CLINICAL_PROMPT",
            str(SERVICE_ROOT / "prompts" / "clinical-simulation-scene-generator.md"),
        )
    ).resolve()

    return Settings(
        environment=os.getenv("ENVIRONMENT", "development"),
        engine_mode=mode,
        api_token=os.getenv("MEDICAL_ENGINE_API_TOKEN") or None,
        allow_render=_truthy("MEDICAL_ENGINE_ALLOW_RENDER", False),
        enable_import_test=_truthy("MEDICAL_ENGINE_ENABLE_IMPORT_TEST", False),
        max_retries=max(0, min(4, int(os.getenv("MEDICAL_ENGINE_MAX_RETRIES", "2")))),
        render_quality=quality,
        tts_service=os.getenv("VOICEOVER_TTS_SERVICE", "gtts").strip().lower(),
        voice_name=os.getenv("VOICEOVER_VOICE_NAME", "").strip(),
        upstream_root=upstream_root,
        prompt_path=prompt_path,
        cors_origins=_csv(
            "MEDICAL_ENGINE_CORS_ORIGINS",
            "http://localhost:3000,https://kampusgo.uzemgo.com",
        ),
        max_parallel_jobs=max(
            1, min(8, int(os.getenv("MEDICAL_ENGINE_MAX_PARALLEL_JOBS", "2")))
        ),
    )
