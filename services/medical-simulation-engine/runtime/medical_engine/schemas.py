from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class Consciousness(str, Enum):
    ALERT = "alert"
    VERBAL = "verbal"
    PAIN = "pain"
    UNRESPONSIVE = "unresponsive"


class Rhythm(str, Enum):
    SINUS = "sinus"
    STEMI = "stemi"
    VF = "vf"
    ROSC = "rosc"


class VisualFocus(str, Enum):
    PATIENT_RESPONSE = "patient_response"
    MONITOR_TRANSITION = "monitor_transition"
    CLINICAL_REASONING = "clinical_reasoning"
    PROCEDURE = "procedure"
    TEAM_MANAGEMENT = "team_management"
    DEBRIEF = "debrief"


class PatientState(BaseModel):
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
    consciousness: Consciousness = Consciousness.ALERT
    pain_score: int = Field(ge=0, le=10)
    heart_rate: int = Field(ge=0, le=250)
    systolic_bp: int = Field(ge=0, le=300)
    diastolic_bp: int = Field(ge=0, le=200)
    spo2: int = Field(ge=0, le=100)
    respiratory_rate: int = Field(ge=0, le=80)
    temperature_c: float = Field(ge=25, le=45)
    rhythm: Rhythm
    visible_signs: list[str] = Field(default_factory=list, max_length=20)
    active_interventions: list[str] = Field(default_factory=list, max_length=20)

    @field_validator("visible_signs", "active_interventions")
    @classmethod
    def clean_list(cls, values: list[str]) -> list[str]:
        return [value.strip()[:160] for value in values if value.strip()]


class LearnerAction(BaseModel):
    action_id: str = Field(pattern=r"^[a-z0-9][a-z0-9-]{2,80}$")
    label: str = Field(min_length=2, max_length=220)
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
    learner_justification: str | None = Field(default=None, max_length=2000)
    time_cost_seconds: int = Field(default=0, ge=0, le=7200)


class SourceReference(BaseModel):
    source_id: str = Field(min_length=2, max_length=200)
    source_version: str = Field(min_length=1, max_length=100)
    locator: str | None = Field(default=None, max_length=500)


class MedicalSceneRequest(BaseModel):
    scenario_id: str = Field(pattern=r"^scn_[a-zA-Z0-9_-]{6,64}$")
    scenario_version: str = Field(pattern=r"^[0-9]+\.[0-9]+\.[0-9]+$")
    module_id: int = Field(ge=1, le=8)
    learning_objective: str = Field(min_length=12, max_length=1200)
    patient_state_before: PatientState
    learner_action: LearnerAction
    patient_state_after: PatientState
    clinical_rationale: str = Field(min_length=12, max_length=1800)
    critical_signal: str = Field(min_length=2, max_length=500)
    debrief_question: str = Field(min_length=8, max_length=800)
    visual_focus: VisualFocus = VisualFocus.MONITOR_TRANSITION
    voiceover_language: Literal["tr", "en"] = "tr"
    duration_seconds: int = Field(default=32, ge=20, le=45)
    safety_constraints: list[str] = Field(default_factory=list, max_length=20)
    expert_approval_reference: str = Field(min_length=6, max_length=200)
    source_references: list[SourceReference] = Field(default_factory=list, max_length=20)
    rights_confirmed: bool
    synthetic_patient_confirmed: bool
    request_ai_generation: bool = True

    @field_validator(
        "learning_objective",
        "clinical_rationale",
        "critical_signal",
        "debrief_question",
        "expert_approval_reference",
    )
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()

    @field_validator("safety_constraints")
    @classmethod
    def clean_constraints(cls, values: list[str]) -> list[str]:
        return [value.strip()[:300] for value in values if value.strip()]

    @model_validator(mode="after")
    def enforce_safety_gate(self) -> "MedicalSceneRequest":
        if not self.rights_confirmed:
            raise ValueError("Source and derivative-use rights must be confirmed.")
        if not self.synthetic_patient_confirmed:
            raise ValueError("The patient must be explicitly confirmed as synthetic.")
        if not self.source_references:
            raise ValueError("At least one approved source reference is required.")
        return self


class JobStatus(str, Enum):
    QUEUED = "queued"
    GENERATING = "generating"
    VALIDATING = "validating"
    RENDERING = "rendering"
    COMPLETED = "completed"
    FAILED = "failed"


class JobPublic(BaseModel):
    job_id: str
    status: JobStatus
    progress: int = Field(ge=0, le=100)
    current_step: str
    engine_mode: str
    created_at: datetime
    updated_at: datetime
    error: str | None = None


class RenderResult(BaseModel):
    job_id: str
    scenario_id: str
    scenario_version: str
    module_id: int
    engine_mode: str
    scene_class_name: str
    video_url: str
    duration_seconds: int
    sha256: str
    storyboard: list[dict]
    validation: dict
    generated_at: datetime
    production_allowed: bool = False
