"""Generate the checked-in technical proof through the TEYS arXivisual runtime."""

from __future__ import annotations

import asyncio
import hashlib
import json
import os
import sys
from datetime import date
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
ENGINE = ROOT / "services" / "medical-simulation-engine"
RUNTIME = ENGINE / "runtime"
VENDOR = ENGINE / "vendor" / "arxivisual-backend"
PROOF_DATA = ROOT.parent / "runtime-proof-data"
MEDIA = PROOF_DATA / "media"
ASSET_DIR = ROOT / "assets" / "medical-simulation"
JOB_ID = "med_8184bcd932b7b717"

os.environ["TEYS_ENGINE_DATA_DIR"] = str(PROOF_DATA)
os.environ["TEYS_ENGINE_JOBS_DIR"] = str(PROOF_DATA / "jobs")
os.environ["MEDIA_DIR"] = str(MEDIA)
os.environ["MEDICAL_AI_MODE"] = "template"
os.environ["MEDICAL_VOICEOVER_ENABLED"] = "false"
os.environ["MEDICAL_RENDER_QUALITY"] = "low_quality"
os.environ["RENDER_MODE"] = "local"
sys.path.insert(0, str(VENDOR))
sys.path.insert(0, str(RUNTIME))

from medical_engine.pipeline import generate_and_render  # noqa: E402
from medical_engine.schemas import MedicalSceneRequest  # noqa: E402


async def main() -> None:
    preset = json.loads((ENGINE / "presets" / "vf-rosc.json").read_text(encoding="utf-8"))
    request = MedicalSceneRequest.model_validate(preset)
    result = await generate_and_render(request, JOB_ID)
    source = MEDIA / f"{JOB_ID}.mp4"
    video = source.read_bytes()
    digest = hashlib.sha256(video).hexdigest()
    if digest != result.sha256 or len(video) < 10_000:
        raise SystemExit("Runtime proof integrity validation failed.")

    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    target = ASSET_DIR / "arxivisual-stemi-preview.mp4"
    target.write_bytes(video)
    manifest = {
        "engine": "arXivisual + TEYS clinical safety runtime",
        "engine_mode": result.engine_mode,
        "scenario_id": result.scenario_id,
        "scenario_version": result.scenario_version,
        "module_id": result.module_id,
        "video": "/medical-simulation/manim/med_seed_vf_rosc.mp4",
        "sha256": result.sha256,
        "scene_class_name": result.scene_class_name,
        "requested_duration_seconds": result.duration_seconds,
        "storyboard": result.storyboard,
        "validation": result.validation,
        "verified_on": date.today().isoformat(),
        "expert_approval": "DOĞRULANMADI",
        "production_allowed": False,
    }
    (ASSET_DIR / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Rendered {len(video)} bytes with SHA-256 {digest}")


if __name__ == "__main__":
    asyncio.run(main())
