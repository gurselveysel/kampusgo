"""Offline contract tests for the TEYS arXivisual adapter."""

from __future__ import annotations

import os
import sys
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

import pytest


ENGINE_ROOT = Path(__file__).resolve().parents[1]
VENDOR_ROOT = ENGINE_ROOT / "vendor" / "arxivisual-backend"
OVERLAY_ROOT = ENGINE_ROOT / "overlays" / "backend"
sys.path.insert(0, str(VENDOR_ROOT))
sys.path.insert(0, str(OVERLAY_ROOT))
os.environ.setdefault(
    "MEDICAL_SIMULATION_PROMPT_PATH",
    str(ENGINE_ROOT / "prompts" / "clinical-simulation-scene-generator.md"),
)
os.environ.setdefault("MEDIA_DIR", str(ENGINE_ROOT / ".test-media"))
os.environ.setdefault("MEDICAL_SIMULATION_JOB_DIR", str(ENGINE_ROOT / ".test-jobs"))
os.environ.setdefault("MEDICAL_SIMULATION_API_KEY", "test-key-0123456789abcdef0123456789abcdef")
os.environ.setdefault("ENVIRONMENT", "production")

from medical_simulation.pipeline import build_visualization_plan  # noqa: E402
from medical_simulation.safety import GeneratedCodeRejected, validate_generated_code  # noqa: E402
from medical_simulation.schemas import MedicalSceneRequest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402


main_spec = spec_from_file_location("teys_medical_main", OVERLAY_ROOT / "main.py")
assert main_spec and main_spec.loader
main_module = module_from_spec(main_spec)
main_spec.loader.exec_module(main_module)
client = TestClient(main_module.app)
AUTH_HEADERS = {
    "X-Medical-Simulation-Key": "test-key-0123456789abcdef0123456789abcdef"
}


def approved_scene() -> MedicalSceneRequest:
    return MedicalSceneRequest.model_validate(
        {
            "scenario_id": "scn_teys_stemi_01",
            "scenario_version": "1.0.0",
            "module_id": 6,
            "learning_objective": "Şoklanabilir ritimde erken defibrilasyonun etkisini değerlendirmek.",
            "patient_state_before": {
                "phase": "vf",
                "consciousness": "unresponsive",
                "pain_score": 0,
                "heart_rate": 0,
                "systolic_bp": 0,
                "diastolic_bp": 0,
                "spo2": 72,
                "respiratory_rate": 0,
                "temperature_c": 36.7,
                "rhythm": "vf",
            },
            "learner_action": {
                "action_id": "emergency-defib",
                "label": "Defibrilasyonu uygula",
                "category": "resuscitation",
                "clinical_rationale": "Şoklanabilir ritimde gecikmeyi azaltır.",
            },
            "patient_state_after": {
                "phase": "rosc",
                "consciousness": "verbal",
                "pain_score": 2,
                "heart_rate": 92,
                "systolic_bp": 106,
                "diastolic_bp": 68,
                "spo2": 96,
                "respiratory_rate": 18,
                "temperature_c": 36.7,
                "rhythm": "rosc",
            },
            "clinical_rationale": "Onaylı sentetik senaryoda erken şok ve CPR sonrasında ROSC gelişir.",
            "visual_focus": "VF ritminden organize ritme ve vital geri dönüşüne geçiş",
            "voiceover_language": "tr",
            "duration_seconds": 20,
            "safety_constraints": ["Sentetik hasta etiketi sürekli görünür olmalı."],
            "expert_approval_reference": "TEYS-SYNTHETIC-SMOKE-001",
            "source_references": [
                {"source_id": "TEYS-SYNTHETIC-STEMI", "source_version": "1.0.0"}
            ],
        }
    )


def test_plan_preserves_approved_transition() -> None:
    plan = build_visualization_plan(approved_scene())
    serialized = plan.model_dump_json()
    assert "rhythm=vf" in serialized
    assert "rhythm=rosc" in serialized
    assert "TEYS-SYNTHETIC-SMOKE-001" in serialized
    assert plan.duration_seconds == 20


def test_generated_code_safety_accepts_bounded_manim() -> None:
    validate_generated_code(
        """from manim import *

class ApprovedScene(Scene):
    def construct(self):
        marker = Circle(color=GREEN)
        self.play(Create(marker))
        self.wait(1)
"""
    )


@pytest.mark.parametrize(
    "source",
    [
        "from manim import *\nimport os\nclass X(Scene):\n def construct(self): pass",
        "from manim import *\nopen('secret.txt')\nclass X(Scene):\n def construct(self): pass",
        "from manim import *\nclass X(Scene):\n def construct(self):\n  while True: pass",
    ],
)
def test_generated_code_safety_rejects_escape_paths(source: str) -> None:
    with pytest.raises(GeneratedCodeRejected):
        validate_generated_code(source)


def test_medical_api_requires_service_key() -> None:
    response = client.get("/api/medical/pilot")
    assert response.status_code == 401


def test_medical_api_exposes_only_controlled_pilot_surface() -> None:
    pilot = client.get("/api/medical/pilot", headers=AUTH_HEADERS)
    assert pilot.status_code == 200
    assert pilot.json()["rawRenderEnabled"] is False
    assert pilot.json()["productionAllowed"] is False
    assert client.get("/api/render", headers=AUTH_HEADERS).status_code == 404


def test_medical_api_forwards_bounded_json_body() -> None:
    response = client.post(
        "/api/medical/scenes",
        headers={**AUTH_HEADERS, "X-Expert-Approval-Confirmed": "true"},
        json={},
    )
    assert response.status_code == 422
