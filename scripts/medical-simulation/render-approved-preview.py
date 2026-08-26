"""Render the approved offline preview through arXivisual's real renderer."""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
ENGINE = ROOT / "services" / "medical-simulation-engine"
VENDOR = ENGINE / "vendor" / "arxivisual-backend"
SOURCE = ENGINE / "templates" / "approved_stemi_transition.py"
OUTPUT = ROOT / "assets" / "medical-simulation"

OUTPUT.mkdir(parents=True, exist_ok=True)
os.environ["STORAGE_MODE"] = "local"
os.environ["MEDIA_DIR"] = str(OUTPUT)
os.environ["ENABLE_VISUAL_QA"] = "0"
os.environ.setdefault("RENDER_MODE", "local")
sys.path.insert(0, str(VENDOR))

from agents.code_validator import CodeValidator  # noqa: E402
from rendering import process_visualization  # noqa: E402


async def main() -> None:
    code = SOURCE.read_text(encoding="utf-8")
    validation = CodeValidator().validate(code)
    if not validation.is_valid:
        raise SystemExit("\n".join(validation.issues_found))
    url = await process_visualization(
        "arxivisual-stemi-preview",
        validation.code,
        quality="low_quality",
    )
    target = OUTPUT / "arxivisual-stemi-preview.mp4"
    if not target.exists() or target.stat().st_size < 10_000:
        raise SystemExit("Manim did not produce a valid preview MP4.")
    print(f"Rendered {url}: {target.stat().st_size} bytes")


if __name__ == "__main__":
    asyncio.run(main())
