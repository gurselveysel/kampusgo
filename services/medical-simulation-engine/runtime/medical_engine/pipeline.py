from __future__ import annotations

import ast
import hashlib
import os
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from agents.code_validator import CodeValidator
from agents.manim_generator import ManimGenerator
from agents.render_tester import RenderTester
from agents.spatial_validator import SpatialValidator
from models.generation import Scene, VisualizationPlan, VisualizationType
from rendering.local_runner import render_manim_local

from .config import settings
from .schemas import MedicalSceneRequest, RenderResult
from .templates import MODULE_TITLES, build_storyboard, deterministic_scene_code


FORBIDDEN_IMPORT_ROOTS = {
    "os", "sys", "subprocess", "socket", "requests", "httpx", "urllib",
    "pathlib", "shutil", "tempfile", "ctypes", "importlib",
}
FORBIDDEN_CALLS = {"open", "exec", "eval", "compile", "__import__", "input"}
FORBIDDEN_MANIM_CALLS = {"MathTex", "Tex", "DecimalNumber", "ChangeDecimalToValue"}


def provider_available() -> bool:
    return bool(
        (os.getenv("AZURE_OPENAI_API_KEY") and os.getenv("AZURE_OPENAI_ENDPOINT"))
        or os.getenv("DEDALUS_API_KEY")
    )


def selected_engine_mode(request: MedicalSceneRequest) -> str:
    if not request.request_ai_generation or settings.ai_mode == "template":
        return "arxivisual-template"
    if settings.ai_mode in {"azure", "dedalus"}:
        return f"arxivisual-ai-{settings.ai_mode}"
    return "arxivisual-ai" if provider_available() else "arxivisual-template-fallback"


def _safe_code(code: str) -> None:
    """Reject unsafe or non-portable generated code before any module import.

    RenderTester imports the generated module, so this AST gate must run first.
    The clinical pilot also rejects LaTeX-backed Manim mobjects; simple monitor
    values must remain renderable in the minimal container through Pango Text.
    """

    tree = ast.parse(code)
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                root = alias.name.split(".", 1)[0]
                if root in FORBIDDEN_IMPORT_ROOTS:
                    raise ValueError(f"Forbidden import in generated scene: {root}")
        elif isinstance(node, ast.ImportFrom):
            root = (node.module or "").split(".", 1)[0]
            if root in FORBIDDEN_IMPORT_ROOTS:
                raise ValueError(f"Forbidden import in generated scene: {root}")
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name):
                if node.func.id in FORBIDDEN_CALLS:
                    raise ValueError(f"Forbidden call in generated scene: {node.func.id}")
                if node.func.id in FORBIDDEN_MANIM_CALLS:
                    raise ValueError(
                        f"LaTeX-dependent Manim call is not allowed: {node.func.id}. "
                        "Use Text and Transform instead."
                    )
            if isinstance(node.func, ast.Attribute) and node.func.attr in {
                "system", "popen", "run", "connect", "urlopen",
            }:
                raise ValueError(f"Forbidden method in generated scene: {node.func.attr}")


def _plan(request: MedicalSceneRequest) -> VisualizationPlan:
    storyboard = build_storyboard(request)
    scenes = [
        Scene(
            order=item["order"],
            description=item["description"],
            duration_seconds=max(1, min(30, item["duration_seconds"])),
            transitions="Clinically meaningful fade/transform; stable patient and monitor zones",
            elements=["synthetic patient", "vital monitor", "decision consequence", "debrief anchor"],
        )
        for item in storyboard
    ]
    return VisualizationPlan(
        concept_name=f"TEYS {MODULE_TITLES[request.module_id]} — {request.learner_action.label}",
        visualization_type=VisualizationType.DATA_FLOW,
        duration_seconds=request.duration_seconds,
        scenes=scenes,
        narration_points=[
            request.learning_objective,
            request.clinical_rationale,
            request.critical_signal,
            request.debrief_question,
        ],
    )


async def _ai_code(request: MedicalSceneRequest) -> tuple[str, str, dict[str, Any]]:
    plan = _plan(request)
    generator = ManimGenerator()
    prompt_path = Path(__file__).parent / "prompts" / "medical_manim_generator.md"
    generator.prompt_template = prompt_path.read_text(encoding="utf-8")

    safety_path = Path(__file__).parents[2] / "prompts" / "clinical-simulation-scene-generator.md"
    if safety_path.exists():
        generator.system_prompt = (
            safety_path.read_text(encoding="utf-8")
            + "\n\n# MANIM REFERENCE\n"
            + generator.system_prompt
        )

    code_result = await generator.run(
        plan=plan,
        voiceover_enabled=settings.voiceover_enabled,
        tts_service=settings.tts_service,
        voice_name=settings.voice_name,
        narration_style="cautious_clinical_educator",
        target_duration_seconds=(20, 45),
    )

    validator = CodeValidator()
    spatial = SpatialValidator()
    render_tester = RenderTester(timeout_seconds=45)
    validation = validator.validate(code_result.code)
    code = validation.code
    feedback: list[str] = []
    if validation.needs_regeneration or not validation.is_valid:
        feedback.extend(validation.issues_found)
    try:
        _safe_code(code)
    except ValueError as exc:
        feedback.append(str(exc))
    spatial_result = spatial.validate(code)
    if spatial_result.needs_regeneration:
        feedback.append(spatial_result.get_feedback_message())

    if not feedback:
        test_result = await render_tester.test_render(code, code_result.scene_class_name)
        if not test_result.success:
            feedback.append(test_result.get_feedback_message())

    if feedback:
        regenerated = await generator.run_with_feedback(
            plan=plan,
            previous_code=code,
            error_message="\n\n".join(feedback),
            voiceover_enabled=settings.voiceover_enabled,
            tts_service=settings.tts_service,
            voice_name=settings.voice_name,
            narration_style="cautious_clinical_educator",
            target_duration_seconds=(20, 45),
        )
        validation = validator.validate(regenerated.code)
        code = validation.code
        code_result = regenerated
        spatial_result = spatial.validate(code)

    if validation.needs_regeneration or not validation.is_valid:
        raise RuntimeError("arXivisual CodeValidator rejected the generated clinical scene.")
    if spatial_result.needs_regeneration:
        raise RuntimeError("arXivisual SpatialValidator rejected the generated clinical scene.")
    _safe_code(code)
    test_result = await render_tester.test_render(code, code_result.scene_class_name)
    if not test_result.success:
        raise RuntimeError(test_result.get_feedback_message())
    return code, code_result.scene_class_name, {
        "code_validator": validation.model_dump(),
        "spatial_validator": spatial_result.model_dump(),
        "render_tester": test_result.model_dump(),
    }


async def generate_and_render(request: MedicalSceneRequest, job_id: str) -> RenderResult:
    engine_mode = selected_engine_mode(request)
    validation: dict[str, Any]
    if engine_mode.startswith("arxivisual-ai"):
        try:
            code, scene_class, validation = await _ai_code(request)
        except Exception as exc:
            if settings.ai_mode in {"azure", "dedalus"}:
                raise
            code, scene_class = deterministic_scene_code(request)
            validation = {
                "ai_fallback_reason": f"{type(exc).__name__}: {str(exc)[:500]}",
                "fallback": True,
            }
            engine_mode = "arxivisual-template-fallback"
    else:
        code, scene_class = deterministic_scene_code(request)
        validator = CodeValidator().validate(code)
        spatial = SpatialValidator().validate(validator.code)
        if not validator.is_valid or validator.needs_regeneration:
            raise RuntimeError("Deterministic medical scene failed CodeValidator.")
        if spatial.needs_regeneration:
            raise RuntimeError("Deterministic medical scene failed SpatialValidator.")
        _safe_code(validator.code)
        render_test = await RenderTester(timeout_seconds=45).test_render(validator.code, scene_class)
        if not render_test.success:
            raise RuntimeError(render_test.get_feedback_message())
        code = validator.code
        validation = {
            "code_validator": validator.model_dump(),
            "spatial_validator": spatial.model_dump(),
            "render_tester": render_test.model_dump(),
        }

    # AI auto-mode may fall back to the deterministic template after the AI
    # attempt. Apply the same safety gate before the render subprocess.
    _safe_code(code)
    video_bytes = await render_manim_local(
        code=code,
        scene_name=scene_class,
        quality=settings.render_quality,
    )
    asset_id = f"{job_id}.mp4"
    asset_path = settings.media_dir / asset_id
    asset_path.write_bytes(video_bytes)
    sha256 = hashlib.sha256(video_bytes).hexdigest()
    return RenderResult(
        job_id=job_id,
        scenario_id=request.scenario_id,
        scenario_version=request.scenario_version,
        module_id=request.module_id,
        engine_mode=engine_mode,
        scene_class_name=scene_class,
        video_url=f"/api/medical/media/{asset_id}",
        duration_seconds=request.duration_seconds,
        sha256=sha256,
        storyboard=build_storyboard(request),
        validation=validation,
        generated_at=datetime.now(UTC),
        production_allowed=False,
    )
