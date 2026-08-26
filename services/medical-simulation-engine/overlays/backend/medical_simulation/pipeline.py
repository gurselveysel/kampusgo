"""Clinical adapter around arXivisual's AI, validator and Manim renderer."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Callable

from agents.code_validator import CodeValidator
from agents.manim_generator import ManimGenerator
from models.generation import Scene, VisualizationPlan, VisualizationType
from rendering import process_visualization

from .safety import GeneratedCodeRejected, validate_generated_code
from .schemas import MedicalSceneRequest, SceneOutput


ProgressCallback = Callable[[str, int, str], None]


def _clinical_prompt_path() -> Path:
    configured = os.getenv("MEDICAL_SIMULATION_PROMPT_PATH", "").strip()
    if configured:
        return Path(configured)
    return Path(__file__).parent.parent / "prompts" / "clinical_simulation_scene_generator.md"


def _clinical_overlay() -> str:
    content = _clinical_prompt_path().read_text(encoding="utf-8")
    # The arXivisual generator's own output contract is complete Python source.
    # Reuse the clinical product and safety rules, but omit the higher-level JSON
    # response contract so the two stages cannot contradict each other.
    rules = content.split("## Output contract", 1)[0].strip()
    return (
        rules
        + "\n\n## arXivisual adapter output\n"
        + "Return only one complete Python source file for the requested Manim Scene. "
        + "Do not return JSON, prose, markdown fences, external URLs or file operations."
    )


class MedicalManimGenerator(ManimGenerator):
    """Use the upstream generator with TEYS clinical guardrails appended."""

    def __init__(self) -> None:
        super().__init__()
        self.system_prompt = f"{self.system_prompt}\n\n{_clinical_overlay()}"


def _state_summary(scene: MedicalSceneRequest, after: bool) -> str:
    state = scene.patient_state_after if after else scene.patient_state_before
    return (
        f"phase={state.phase}; consciousness={state.consciousness}; pain={state.pain_score}/10; "
        f"HR={state.heart_rate}/min; BP={state.systolic_bp}/{state.diastolic_bp} mmHg; "
        f"SpO2={state.spo2}%; RR={state.respiratory_rate}/min; "
        f"temperature={state.temperature_c:.1f} C; rhythm={state.rhythm}"
    )


def build_visualization_plan(scene: MedicalSceneRequest) -> VisualizationPlan:
    """Translate an approved clinical state transition into arXivisual's plan."""

    before = _state_summary(scene, after=False)
    after = _state_summary(scene, after=True)
    beat_duration = max(3, scene.duration_seconds // 4)
    remainder = scene.duration_seconds - (beat_duration * 3)

    return VisualizationPlan(
        concept_name=f"TEYS Module {scene.module_id}: {scene.learner_action.label}",
        visualization_type=VisualizationType.DATA_FLOW,
        duration_seconds=scene.duration_seconds,
        scenes=[
            Scene(
                order=1,
                description=(
                    "Open on a clearly labelled synthetic patient, a stable monitor zone and "
                    f"the approved pre-action state: {before}"
                ),
                duration_seconds=beat_duration,
                transitions="Fade in patient state and monitor without decorative motion.",
                elements=["synthetic patient label", "ECG trace", "vital signs", "decision point"],
            ),
            Scene(
                order=2,
                description=(
                    f"Show the learner action neutrally: {scene.learner_action.label}. "
                    f"Visual focus: {scene.visual_focus}"
                ),
                duration_seconds=beat_duration,
                transitions="Highlight the intervention path while keeping the patient and monitor fixed.",
                elements=["learner action", "intervention path", "time marker"],
            ),
            Scene(
                order=3,
                description=(
                    "Animate only the supplied, expert-approved physiological transition. "
                    f"Before: {before}. After: {after}."
                ),
                duration_seconds=beat_duration,
                transitions="Morph numeric vitals and waveform state; do not invent intermediate values.",
                elements=["before-after comparison", "vital trend", "rhythm transition"],
            ),
            Scene(
                order=4,
                description=(
                    "End with the clinical rationale and one reflection anchor. "
                    f"Rationale: {scene.clinical_rationale}"
                ),
                duration_seconds=max(3, remainder),
                transitions="Reduce motion and hold the debrief comparison for reading.",
                elements=["clinical rationale", "debrief question", "source and approval footer"],
            ),
        ],
        narration_points=[
            f"Language: {scene.voiceover_language}.",
            f"Learning objective: {scene.learning_objective}",
            f"Approved action rationale: {scene.learner_action.clinical_rationale}",
            "This is synthetic educational data and not clinical decision support.",
            f"Expert approval reference: {scene.expert_approval_reference}",
            *[f"Safety constraint: {item}" for item in scene.safety_constraints],
        ],
    )


async def generate_and_render_scene(
    scene: MedicalSceneRequest,
    job_id: str,
    quality: str,
    voiceover_enabled: bool,
    update: ProgressCallback,
) -> SceneOutput:
    """Run the real arXivisual generation→validation→Manim render path."""

    plan = build_visualization_plan(scene)
    generator = MedicalManimGenerator()
    validator = CodeValidator()
    generated = None
    feedback = ""

    for attempt in range(1, 3):
        update("generating", 20 if attempt == 1 else 35, f"ai_generation_attempt_{attempt}")
        if generated is None:
            generated = await generator.run(
                plan=plan,
                voiceover_enabled=voiceover_enabled,
                tts_service=os.getenv("VOICEOVER_TTS_SERVICE", "gtts"),
                voice_name=os.getenv("VOICEOVER_VOICE_NAME", ""),
                narration_style="clinical_simulation_debrief",
                target_duration_seconds=(15, 45),
            )
        else:
            generated = await generator.run_with_feedback(
                plan=plan,
                previous_code=generated.code,
                error_message=feedback,
                voiceover_enabled=voiceover_enabled,
                tts_service=os.getenv("VOICEOVER_TTS_SERVICE", "gtts"),
                voice_name=os.getenv("VOICEOVER_VOICE_NAME", ""),
                narration_style="clinical_simulation_debrief",
                target_duration_seconds=(15, 45),
            )

        update("validating", 48 if attempt == 1 else 58, "source_validation")
        validation = validator.validate(generated.code)
        generated.code = validation.code
        issues = list(validation.issues_found)
        try:
            validate_generated_code(generated.code)
        except GeneratedCodeRejected as exc:
            issues.append(str(exc))

        if validation.is_valid and not issues:
            break

        feedback = validator.get_error_summary(validation)
        if issues:
            feedback += "\nSecurity validation failed:\n- " + "\n- ".join(issues)
        generated = generated if attempt == 1 else None
    else:
        raise GeneratedCodeRejected("Generated scene failed validation after two attempts.")

    if generated is None:
        raise GeneratedCodeRejected("No validated scene source was produced.")

    validate_generated_code(generated.code)
    video_id = f"medviz_{job_id.removeprefix('medjob_')}"
    update("rendering", 72, "manim_render")
    await process_visualization(video_id, generated.code, quality=quality)
    update("rendering", 94, "storage_finalize")

    return SceneOutput(
        scene_title=f"{scene.learner_action.label} — klinik durum geçişi",
        clinical_summary=scene.clinical_rationale,
        debrief_question=(
            "Bu karar sonrasında hangi vital veya ritim değişikliği yeniden değerlendirmeyi "
            "öncelikli hâle getirir?"
        ),
        narration_lines=generated.narration_lines,
        video_id=video_id,
        video_url=f"/api/medical/video/{video_id}",
    )
