from __future__ import annotations

import os
import time

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("MEDICAL_ENGINE_MODE", "preview")
os.environ.setdefault("MEDICAL_ENGINE_ALLOW_RENDER", "0")
os.environ.pop("MEDICAL_ENGINE_API_TOKEN", None)

from runtime.main import app  # noqa: E402
from runtime.schemas import ClinicalSceneRequest  # noqa: E402
from runtime.security import scan_generated_code  # noqa: E402


client = TestClient(app)


def example_payload() -> dict:
    response = client.get("/v1/examples/stemi-vf")
    assert response.status_code == 200
    return response.json()


def test_health_exposes_fail_closed_capabilities() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["capabilities"]["raw_code_endpoint_exposed"] is False
    assert body["capabilities"]["curriculum_composition"] == {
        "ucep_referenced_core": 70,
        "institutional_autonomy": 30,
    }
    assert body["capabilities"]["effective_mode"] == "preview"


def test_plan_is_deterministic_and_prerequisite_aware() -> None:
    payload = example_payload()
    response = client.post("/v1/scene-plans", json=payload)
    assert response.status_code == 200
    plan = response.json()
    assert len(plan["beats"]) == 5
    assert plan["generated_by"] == "deterministic"
    assert plan["duration_seconds"] == payload["duration_seconds"]
    assert "Uzman onayı" in plan["source_and_approval_footer"]


def test_preview_job_generates_valid_manim_contract() -> None:
    payload = example_payload()
    response = client.post("/v1/scene-jobs", json=payload)
    assert response.status_code == 202
    job_id = response.json()["job_id"]

    result = None
    for _ in range(20):
        polled = client.get(f"/v1/scene-jobs/{job_id}")
        assert polled.status_code == 200
        result = polled.json()
        if result["status"] in {"completed", "failed"}:
            break
        time.sleep(0.01)

    assert result is not None
    assert result["status"] == "completed", result.get("error")
    artifact = result["artifact"]
    assert artifact["scene_class_name"] == "TeysClinicalScene"
    assert "from manim import *" in artifact["manim_code"]
    assert artifact["validation"]["security_valid"] is True
    assert artifact["video_url"] is None


def test_render_request_is_rejected_when_render_gate_is_off() -> None:
    payload = example_payload()
    payload["request_render"] = True
    response = client.post("/v1/scene-jobs", json=payload)
    assert response.status_code == 409


def test_obvious_phi_is_rejected_before_generation() -> None:
    payload = example_payload()
    payload["clinical_rationale"] += " Hasta adı: Gerçek Kişi; e-posta: real@example.com"
    response = client.post("/v1/scene-plans", json=payload)
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "possible_phi_detected"


def test_unapproved_source_cannot_enter_contract() -> None:
    payload = example_payload()
    payload["source_references"][0]["approved_for_scenario"] = False
    with pytest.raises(ValidationError):
        ClinicalSceneRequest.model_validate(payload)


def test_generated_code_scanner_rejects_network_and_process_access() -> None:
    issues = scan_generated_code(
        "import os\nimport requests\nfrom manim import *\nos.system('id')\nrequests.get('https://example.com')"
    )
    assert any("os" in issue for issue in issues)
    assert any("requests" in issue for issue in issues)
