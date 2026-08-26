"""Strict request and job contracts for medical scene generation."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class PatientState(StrictModel):
    phase: Literal[
        "assessment",
        "revealing",
        "reasoning",
        "diagnostics",
        "treatment",
        "vf",
        "rosc",
        "team",
        "integrated",
    ]
    consciousness: Literal["alert", "verbal", "pain", "unresponsive"]
    pain_score: int = Field(ge=0, le=10)
    heart_rate: int = Field(ge=0, le=240)
    systolic_bp: int = Field(ge=0, le=260)
    diastolic_bp: int = Field(ge=0, le=180)
    spo2: int = Field(ge=0, le=100)
    respiratory_rate: int = Field(ge=0, le=80)
    temperature_c: float = Field(ge=25, le=45)
    rhythm: Literal["sinus", "stemi", "vf", "rosc"]


class LearnerAction(StrictModel):
    action_id: str = Field(pattern=r"^[a-z0-9][a-z0-9-]{2,80}$")
    label: str = Field(min_length=1, max_length=220)
    category: Literal[
        "communication",
        "assessment",
        "history",
        "examination",
        "reasoning",
        "diagnostic_test",
        "medication",
        "procedure",
        "resuscitation",
        "team_management",
        "handoff",
        "reassessment",
    ]
    clinical_rationale: str = Field(min_length=1, max_length=1_500)


class SourceReference(StrictModel):
    source_id: str = Field(min_length=1, max_length=200)
    source_version: str = Field(min_length=1, max_length=100)
    locator: str | None = Field(default=None, max_length=500)


class MedicalSceneRequest(StrictModel):
    scenario_id: str = Field(pattern=r"^scn_[a-zA-Z0-9_-]{6,64}$")
    scenario_version: str = Field(pattern=r"^[0-9]+\.[0-9]+\.[0-9]+$")
    module_id: int = Field(ge=1, le=8)
    learning_objective: str = Field(min_length=12, max_length=1_500)
    patient_state_before: PatientState
    learner_action: LearnerAction
    patient_state_after: PatientState
    clinical_rationale: str = Field(min_length=12, max_length=2_000)
    visual_focus: str = Field(min_length=3, max_length=1_000)
    voiceover_language: Literal["tr", "en"] = "tr"
    duration_seconds: int = Field(default=24, ge=15, le=45)
    safety_constraints: list[str] = Field(min_length=1, max_length=12)
    expert_approval_reference: str = Field(min_length=6, max_length=200)
    source_references: list[SourceReference] = Field(default_factory=list, max_length=20)

    @field_validator("safety_constraints")
    @classmethod
    def validate_safety_constraints(cls, values: list[str]) -> list[str]:
        cleaned = [value.strip() for value in values if value.strip()]
        if not cleaned:
            raise ValueError("At least one safety constraint is required.")
        if any(len(value) > 500 for value in cleaned):
            raise ValueError("A safety constraint exceeds 500 characters.")
        return cleaned


class CreateMedicalScenePayload(StrictModel):
    scene: MedicalSceneRequest
    quality: Literal["low_quality", "medium_quality"] = "low_quality"
    voiceover_enabled: bool = False


class JobAccepted(StrictModel):
    job_id: str
    status: Literal["queued"]
    status_url: str
    production_allowed: Literal[False] = False


class SceneOutput(StrictModel):
    scene_title: str
    clinical_summary: str
    debrief_question: str
    narration_lines: list[str] = Field(default_factory=list)
    video_id: str
    video_url: str
    generator: Literal["arxivisual-manim-generator"] = "arxivisual-manim-generator"


class JobState(StrictModel):
    job_id: str
    status: Literal[
        "queued",
        "generating",
        "validating",
        "rendering",
        "completed",
        "failed",
    ]
    progress: int = Field(ge=0, le=100)
    current_step: str
    created_at: str
    updated_at: str
    scene: MedicalSceneRequest
    output: SceneOutput | None = None
    error_code: str | None = None
    error: str | None = None
    production_allowed: Literal[False] = False
