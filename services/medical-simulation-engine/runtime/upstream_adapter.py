"""Adapter that turns approved clinical state transitions into arXivisual Manim jobs."""

from __future__ import annotations

import json
import logging
import sys
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .config import Settings
from .deterministic import build_deterministic_artifact, build_deterministic_plan
from .schemas import (
    ClinicalScenePlan,
    ClinicalSceneRequest,
    GeneratedArtifact,
    SceneBeat,
    ValidationReport,
    VisualFocus,
)
from .security import join_issues, scan_generated_code

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class EngineRunResult:
    plan: ClinicalScenePlan
    artifact: GeneratedArtifact


class UpstreamUnavailable(RuntimeError):
    """Raised when the vendored engine or its runtime dependencies are absent."""


class ClinicalGenerationError(RuntimeError):
    """Raised when generated code cannot pass the mandatory safety gates."""


class ArxivisualMedicalAdapter:
    """Fail-closed bridge to the vendored arXivisual agents and renderer.

    The public API never accepts Python. It accepts a structured, expert-approved
    synthetic state transition, generates code internally, validates it, and only
    then optionally hands it to the isolated render layer.
    """

    def __init__(self, settings: Settings):
        self.settings = settings
        self._modules: dict[str, Any] | None = None

    def _clinical_overlay(self, request: ClinicalSceneRequest) -> str:
        prompt = self.settings.prompt_path.read_text(encoding="utf-8")
        approved_payload = request.model_dump_json(indent=2)
        return (
            "\n\n"
            + "=" * 80
            + "\n# TEYS/MAMS CLINICAL SAFETY OVERLAY\n"
            + "=" * 80
            + "\n"
            + prompt
            + "\n\n# APPROVED STRUCTURED SCENE INPUT\n"
            + approved_payload
            + "\n\n"
            + "Treat every value above as fixed scenario data. Do not invent new doses, "
              "diagnoses, contraindications, vital values, patient identifiers or treatment "
              "effects. All visible patient data must be labelled synthetic. Use Turkish "
              "narration when voiceover_language is tr."
        )

    def _load_upstream(self) -> dict[str, Any]:
        if self._modules is not None:
            return self._modules

        root = self.settings.upstream_root
        if not root.exists():
            raise UpstreamUnavailable(f"Vendored upstream root does not exist: {root}")
        if str(root) not in sys.path:
            sys.path.insert(0, str(root))

        try:
            from agents.code_validator import CodeValidator
            from agents.manim_generator import ManimGenerator
            from agents.render_tester import RenderTester
            from agents.spatial_validator import SpatialValidator
            from agents.visualization_planner import VisualizationPlanner
            from agents.voiceover_script_validator import VoiceoverScriptValidator
            from models.generation import (
                GeneratedCode,
                Scene,
                VisualizationCandidate,
                VisualizationPlan,
                VisualizationType,
            )
            from rendering import process_visualization
        except Exception as exc:  # pragma: no cover - dependency-specific
            raise UpstreamUnavailable(
                "Vendored arXivisual backend is present but runtime dependencies could not be loaded"
            ) from exc

        self._modules = {
            "CodeValidator": CodeValidator,
            "ManimGenerator": ManimGenerator,
            "RenderTester": RenderTester,
            "SpatialValidator": SpatialValidator,
            "VisualizationPlanner": VisualizationPlanner,
            "VoiceoverScriptValidator": VoiceoverScriptValidator,
            "GeneratedCode": GeneratedCode,
            "Scene": Scene,
            "VisualizationCandidate": VisualizationCandidate,
            "VisualizationPlan": VisualizationPlan,
            "VisualizationType": VisualizationType,
            "process_visualization": process_visualization,
        }
        return self._modules

    def _visualization_type(self, focus: VisualFocus) -> Any:
        modules = self._load_upstream()
        VisualizationType = modules["VisualizationType"]
        mapping = {
            VisualFocus.VIRTUAL_PATIENT: VisualizationType.ARCHITECTURE,
            VisualFocus.PHYSIOLOGY: VisualizationType.DATA_FLOW,
            VisualFocus.ECG: VisualizationType.DATA_FLOW,
            VisualFocus.MONITOR_TREND: VisualizationType.DATA_FLOW,
            VisualFocus.PROCEDURE: VisualizationType.ALGORITHM,
            VisualFocus.MEDICATION_RESPONSE: VisualizationType.DATA_FLOW,
            VisualFocus.TEAM_COORDINATION: VisualizationType.ARCHITECTURE,
            VisualFocus.CLINICAL_REASONING: VisualizationType.MATRIX,
            VisualFocus.DEBRIEF: VisualizationType.DATA_FLOW,
        }
        return mapping[focus]

    def _build_candidate(self, request: ClinicalSceneRequest) -> Any:
        modules = self._load_upstream()
        Candidate = modules["VisualizationCandidate"]
        clinical_context = {
            "synthetic_patient_id": request.synthetic_patient_id,
            "module_id": request.module_id,
            "learning_objective": request.learning_objective,
            "before": request.patient_state_before.model_dump(mode="json"),
            "learner_action": request.learner_action.model_dump(mode="json"),
            "after": request.patient_state_after.model_dump(mode="json"),
            "clinical_rationale": request.clinical_rationale,
            "safety_constraints": request.safety_constraints,
            "expert_approval_reference": request.expert_approval_reference,
        }
        return Candidate(
            section_id=f"{request.scenario_id}:{request.scenario_version}",
            concept_name=request.scene_title,
            concept_description=(
                "Animate an expert-approved synthetic clinical state transition for "
                f"TEYS module {request.module_id}: {request.visual_focus.value}."
            ),
            visualization_type=self._visualization_type(request.visual_focus),
            priority=5,
            context=json.dumps(clinical_context, ensure_ascii=False, indent=2),
        )

    def _upstream_plan_from_deterministic(
        self,
        request: ClinicalSceneRequest,
        plan: ClinicalScenePlan,
    ) -> Any:
        modules = self._load_upstream()
        UpstreamScene = modules["Scene"]
        UpstreamPlan = modules["VisualizationPlan"]
        scenes = [
            UpstreamScene(
                order=beat.order,
                description=(
                    f"{beat.label}: {beat.state_transition}. Visible: "
                    + ", ".join(beat.visible_elements)
                    + f". Narration intent: {beat.narration}"
                ),
                duration_seconds=beat.duration_seconds,
                transitions="Clinically meaningful transition; stable patient/monitor layout; no decorative motion.",
                elements=beat.visible_elements,
            )
            for beat in plan.beats
        ]
        return UpstreamPlan(
            concept_name=request.scene_title,
            visualization_type=self._visualization_type(request.visual_focus),
            duration_seconds=plan.duration_seconds,
            scenes=scenes,
            narration_points=[beat.narration for beat in plan.beats],
        )

    def _clinical_plan_from_upstream(
        self,
        request: ClinicalSceneRequest,
        upstream_plan: Any,
    ) -> ClinicalScenePlan:
        fallback = build_deterministic_plan(request)
        if not upstream_plan.scenes:
            return fallback.model_copy(update={"generated_by": "upstream_ai"})

        beats: list[SceneBeat] = []
        narration_points = list(upstream_plan.narration_points or [])
        for index, scene in enumerate(upstream_plan.scenes, start=1):
            narration = (
                narration_points[index - 1]
                if index - 1 < len(narration_points)
                else fallback.beats[min(index - 1, len(fallback.beats) - 1)].narration
            )
            beats.append(
                SceneBeat(
                    order=index,
                    label=f"Sahne {index}",
                    duration_seconds=max(1, min(20, int(scene.duration_seconds))),
                    narration=narration,
                    visible_elements=list(scene.elements or []),
                    state_transition=scene.description,
                )
            )

        total = sum(beat.duration_seconds for beat in beats)
        return ClinicalScenePlan(
            scene_title=request.scene_title,
            visualization_type=request.visual_focus.value,
            duration_seconds=max(20, min(45, total)),
            beats=beats,
            debrief_question=fallback.debrief_question,
            source_and_approval_footer=fallback.source_and_approval_footer,
            generated_by="upstream_ai",
        )

    async def _plan_with_upstream(self, request: ClinicalSceneRequest) -> tuple[ClinicalScenePlan, Any, Any]:
        modules = self._load_upstream()
        candidate = self._build_candidate(request)
        planner = modules["VisualizationPlanner"]()
        planner.system_prompt += self._clinical_overlay(request)

        try:
            upstream_plan = await planner.run(
                candidate=candidate,
                full_section_content=candidate.context,
                paper_context=(
                    "TEYS/MAMS prerequisite-based medical education simulation. "
                    f"Module {request.module_id}; UÇEP tags: {', '.join(request.ucep_alignment_codes) or 'pending board mapping'}; "
                    f"horizontal integration: {', '.join(request.horizontal_integration_tags) or 'not supplied'}; "
                    f"vertical integration: {', '.join(request.vertical_integration_tags) or 'not supplied'}."
                ),
            )
            clinical_plan = self._clinical_plan_from_upstream(request, upstream_plan)
        except Exception:
            logger.exception("Clinical AI planner failed; using deterministic approved storyboard")
            clinical_plan = build_deterministic_plan(request)
            upstream_plan = self._upstream_plan_from_deterministic(request, clinical_plan)

        return clinical_plan, upstream_plan, candidate

    async def _validate(
        self,
        generated: Any,
        upstream_plan: Any,
        candidate: Any,
    ) -> tuple[Any, ValidationReport, str]:
        modules = self._load_upstream()

        code_result = modules["CodeValidator"]().validate(generated.code)
        fixed_code = code_result.code
        if fixed_code != generated.code:
            generated = modules["GeneratedCode"](
                code=fixed_code,
                scene_class_name=generated.scene_class_name,
                dependencies=generated.dependencies,
                voiceover_enabled=generated.voiceover_enabled,
                narration_lines=generated.narration_lines,
                narration_beats=generated.narration_beats,
            )

        spatial_result = modules["SpatialValidator"]().validate(fixed_code)
        voice_result = modules["VoiceoverScriptValidator"](
            strict=True,
            min_words=6,
            max_words=36,
            use_llm_judge=False,
        ).validate(generated, upstream_plan, candidate)
        security_issues = scan_generated_code(fixed_code)

        spatial_issues = [
            *(f"Out of bounds: {item}" for item in spatial_result.out_of_bounds),
            *(f"Potential overlap: {item}" for item in spatial_result.potential_overlaps),
            *(f"Spacing: {item}" for item in spatial_result.spacing_issues),
        ]

        import_tested = False
        import_passed: bool | None = None
        import_issues: list[str] = []
        if self.settings.enable_import_test and self.settings.renderer_available:
            import_tested = True
            render_test = await modules["RenderTester"]().test_render(
                fixed_code,
                generated.scene_class_name,
            )
            import_passed = render_test.success
            if not render_test.success:
                import_issues.append(render_test.get_feedback_message())

        issues = join_issues(
            [
                code_result.issues_found,
                spatial_issues,
                voice_result.issues_found,
                security_issues,
                import_issues,
            ]
        )
        report = ValidationReport(
            syntax_valid=code_result.is_valid,
            spatial_valid=not spatial_result.needs_regeneration,
            voiceover_valid=voice_result.is_valid,
            security_valid=not security_issues,
            import_tested=import_tested,
            import_test_passed=import_passed,
            issues=issues,
            fixes=list(code_result.issues_fixed),
        )
        feedback = "\n".join(issues) or "Validation passed"
        return generated, report, feedback

    async def run(self, request: ClinicalSceneRequest) -> EngineRunResult:
        effective_mode = self.settings.effective_mode
        if effective_mode == "preview":
            plan = build_deterministic_plan(request)
            return EngineRunResult(
                plan=plan,
                artifact=build_deterministic_artifact(request, plan),
            )

        modules = self._load_upstream()
        clinical_plan, upstream_plan, candidate = await self._plan_with_upstream(request)

        generator = modules["ManimGenerator"]()
        generator.system_prompt += self._clinical_overlay(request)
        generated = await generator.run(
            upstream_plan,
            voiceover_enabled=True,
            tts_service=self.settings.tts_service,
            voice_name=self.settings.voice_name,
            narration_style="cautious_clinical_educator",
            target_duration_seconds=(20, 45),
        )

        report: ValidationReport | None = None
        feedback = ""
        for attempt in range(self.settings.max_retries + 1):
            generated, report, feedback = await self._validate(
                generated,
                upstream_plan,
                candidate,
            )
            if report.passed:
                break
            if attempt >= self.settings.max_retries:
                break
            generated = await generator.run_with_feedback(
                plan=upstream_plan,
                previous_code=generated.code,
                error_message=(
                    "TEYS/MAMS clinical safety and render validation failed. "
                    "Correct every issue without changing the approved clinical values:\n"
                    + feedback
                ),
                voiceover_enabled=True,
                tts_service=self.settings.tts_service,
                voice_name=self.settings.voice_name,
                narration_style="cautious_clinical_educator",
                target_duration_seconds=(20, 45),
            )

        assert report is not None
        if not report.passed:
            raise ClinicalGenerationError(
                "Generated scene failed mandatory validation gates: " + feedback
            )

        video_url: str | None = None
        if request.request_render:
            if effective_mode != "render" or not self.settings.allow_render:
                raise ClinicalGenerationError(
                    "Render requested, but the engine is not in an enabled render environment"
                )
            viz_id = (
                "teys_"
                + request.scenario_id.replace("/", "_").replace(".", "_")
                + "_"
                + uuid.uuid4().hex[:12]
            )
            video_url = await modules["process_visualization"](
                viz_id,
                generated.code,
                self.settings.render_quality,
            )

        artifact = GeneratedArtifact(
            scene_class_name=generated.scene_class_name,
            manim_code=generated.code,
            narration_lines=list(generated.narration_lines),
            validation=report,
            video_url=video_url,
        )
        return EngineRunResult(plan=clinical_plan, artifact=artifact)
