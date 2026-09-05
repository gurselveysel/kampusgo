"""Render the eight checked-in TEYS module scenes through the engine API."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import time
import urllib.error
import urllib.request
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_PRESET = ROOT / "services" / "medical-simulation-engine" / "presets" / "module-library.json"


def api_json(base_url: str, engine_key: str, method: str, path: str, payload: Any | None = None) -> dict[str, Any]:
    body = None if payload is None else json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        f"{base_url.rstrip('/')}{path}",
        data=body,
        method=method,
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-TEYS-Engine-Key": engine_key,
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {path} failed with HTTP {error.code}: {detail[:1000]}") from error


def api_bytes(base_url: str, engine_key: str, path: str) -> bytes:
    request = urllib.request.Request(
        f"{base_url.rstrip('/')}{path}",
        headers={"Accept": "video/mp4", "X-TEYS-Engine-Key": engine_key},
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def wait_for_result(base_url: str, engine_key: str, job_id: str, timeout_seconds: int) -> dict[str, Any]:
    deadline = time.monotonic() + timeout_seconds
    last_status = "queued"
    while time.monotonic() < deadline:
        job = api_json(base_url, engine_key, "GET", f"/api/medical/jobs/{job_id}")
        last_status = str(job.get("status", "unknown"))
        print(f"{job_id}: {last_status} {job.get('progress', 0)}% — {job.get('current_step', '')}", flush=True)
        if last_status == "completed":
            return api_json(base_url, engine_key, "GET", f"/api/medical/jobs/{job_id}/result")
        if last_status == "failed":
            raise RuntimeError(f"{job_id} failed: {job.get('error', 'unknown engine error')}")
        time.sleep(3)
    raise TimeoutError(f"{job_id} did not finish within {timeout_seconds}s (last status: {last_status}).")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:18002")
    parser.add_argument("--engine-key", default=os.environ.get("ENGINE_KEY", ""))
    parser.add_argument("--preset", type=Path, default=DEFAULT_PRESET)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--timeout-seconds", type=int, default=720)
    args = parser.parse_args()

    if len(args.engine_key) < 24:
        raise SystemExit("A non-trivial ENGINE_KEY is required.")

    entries = json.loads(args.preset.read_text(encoding="utf-8"))
    if len(entries) != 8:
        raise SystemExit(f"Expected exactly eight module scenes, received {len(entries)}.")

    args.output_dir.mkdir(parents=True, exist_ok=True)
    manifest: dict[str, Any] = {
        "engine": "arXivisual + TEYS clinical safety runtime",
        "engine_mode": "arxivisual-template",
        "generated_at": datetime.now(UTC).isoformat(),
        "scene_count": 8,
        "expert_approval": "DOĞRULANMADI",
        "production_allowed": False,
        "scenes": [],
    }

    for index, entry in enumerate(entries, start=1):
        output_name = str(entry["output_name"])
        payload = entry["request"]
        print(f"Rendering {index}/8: {output_name}", flush=True)
        created = api_json(args.base_url, args.engine_key, "POST", "/api/medical/jobs", payload)
        result = wait_for_result(
            args.base_url,
            args.engine_key,
            str(created["job_id"]),
            args.timeout_seconds,
        )
        video = api_bytes(args.base_url, args.engine_key, str(result["video_url"]))
        digest = hashlib.sha256(video).hexdigest()
        if digest != result["sha256"]:
            raise RuntimeError(f"SHA-256 mismatch for {output_name}.")
        if len(video) < 10_000 or b"ftyp" not in video[:64]:
            raise RuntimeError(f"Invalid MP4 payload for {output_name} ({len(video)} bytes).")

        target = args.output_dir / output_name
        target.write_bytes(video)
        manifest["scenes"].append(
            {
                "module_id": result["module_id"],
                "scenario_id": result["scenario_id"],
                "video": f"/medical-simulation/manim/{output_name}",
                "bytes": len(video),
                "sha256": digest,
                "scene_class_name": result["scene_class_name"],
                "engine_mode": result["engine_mode"],
                "storyboard": result["storyboard"],
                "validation": result["validation"],
                "expert_approval": payload["expert_approval_reference"],
                "production_allowed": False,
            }
        )

    manifest_path = args.output_dir / "scene-library-manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    total_bytes = sum(int(scene["bytes"]) for scene in manifest["scenes"])
    print(f"Rendered 8 module scenes ({total_bytes} bytes). Manifest: {manifest_path}", flush=True)


if __name__ == "__main__":
    main()
