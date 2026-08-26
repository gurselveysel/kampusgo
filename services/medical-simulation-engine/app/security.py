"""Safety boundaries for a synthetic educational simulation service."""

from __future__ import annotations

import re
from pathlib import Path


EDUCATIONAL_DISCLAIMER = (
    "Bu sistem yalnızca sentetik tıp eğitimi simülasyonudur; gerçek hasta değerlendirmesi, "
    "tanı, tedavi veya klinik karar desteği amacıyla kullanılamaz."
)


def require_synthetic(confirmed: bool) -> None:
    if not confirmed:
        raise ValueError(
            "Only synthetic educational cases are accepted. Do not submit real patient data."
        )


def safe_slug(value: str) -> str:
    normalized = re.sub(r"[^a-z0-9-]+", "-", value.lower()).strip("-")
    if not normalized or len(normalized) > 63:
        raise ValueError("Invalid output slug")
    return normalized


def ensure_within_directory(base: Path, candidate: Path) -> Path:
    base_resolved = base.resolve()
    candidate_resolved = candidate.resolve()
    if base_resolved not in candidate_resolved.parents and candidate_resolved != base_resolved:
        raise ValueError("Output path escaped the render directory")
    return candidate_resolved
