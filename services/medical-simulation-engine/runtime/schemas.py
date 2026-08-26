"""Typed API contracts for clinical visualization generation."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator, model_validator


class EngineMode(str, Enum):
    PREVIEW = "preview"
    AI = "ai"
    RENDER = "render"


class JobStatus(str, Enum):
    QUEUED = "queued"
    PLANNING = "planning"
    GENERATING = "generating"
    VALIDATING = "validating"
    RENDERING = "rendering"
    COMPLETED = "completed"
    FAILED = "failed"


class VisualFocus(str, Enum):
    VIRTUAL_PATIENT = "virtual_patient"
    PHYSIOLOGY = "physiology"
    ECG = "ecg"
    MONITOR_TREND = "monitor_trend"
    PROCEDURE = "procedure"
    MEDICATION_RESPONSE = "medication_response"
    TEAM_COORDINATION = "team_coordination"
    CLINICAL_REASONING = "clinical_reasoning"
    DEBRIEF = "debrief"


class Rhythm(str, Enum):
    SINUS = "sinus"
    SINUS_TACHYCARDIA = "sinus_tachycardia"
    SINUS_BRADYCARDIA = "sinus_bradycardia"
    STEMI = "stemi"
    SVT = "svt"
    AF = "atrial_fibrillation"
    VT = "ventricular_tachycardia"
    VF = "ventricular_fibrillation"
    ASYSTOLE = "asystole"
    PEA = "pea"
    ROSC = "rosc"
    OTHER = "other"


class VitalState(BaseModel):
    model_config = ConfigDict(extra="forbid")

    heart_rate: int = Field(ge=0, le=250)
    systolic_bp: int = Field(ge=0, le=260)
    diastolic_bp: int = Field(ge=0, le=180)
    spo2: int = Field(ge=0, le=100)
    respiratory_rate: int = Field(ge=0, le=80)
    temperature_c: float = Field(ge=28, le=45)
    rhythm: Rhythm
    consciousness: str = Field(min_length=2, max_length=120)
    pain_score: int = Field(ge=0, le=10)
    breathing_pattern: str = Field(min_length=2, max_length=160)
    clinical_description: str = Field(min_length=10, max_length=1200)


class LearnerAction(BaseModel):
    model_config = ConfigDict(extra="forbid")

    action_id: str = Field(pattern=r"^[a-zA-Z0-9][a-zA-Z0-9._:-]{2,79}$")
    category: Literal[
        "observation",
        "history",
        "examination",
        "test",
        "medication",
        "oxygen",
        "fluid",
        "procedure",
        "monitoring",
        "consultation",
        "team_command",
        "handoff",
        "other",
    ]
    label: str = Field(min_length=3, max_length=240)
    rationale: str = Field(min_length=10, max_length=1600)
    timing_seconds: int = Field(ge=0, le=3600)
    parameters: dict[str, str | int | float | bool] = Field(default_factory=dict)


class SourceReference(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source_id: str = Field(pattern=r"^[a-zA-Z0-9][a-zA-Z0-9._:-]{2,99}$")
    title: str = Field(min_length=3, max_length=300)
    version: str = Field(min_length=1, max_length=100)
    url: HttpUrl | None = None
    approved_for_scenario: bool = True
    approval_note: str = Field(min_length=3, max_length=500)


class ClinicalSceneRequest(BaseModel):
    """Only structured, expert-approved, synthetic cases are accepted."""

    model_config = ConfigDict(extra="forbid")

    scenario_id: str = Field(pattern=r"^[a-zA-Z0-9][a-zA-Z0-9._:-]{2,99}$")
    scenario_version: str = Field(min_length=1, max_length=60)
    module_id: int = Field(ge=1, le=8)
    scene_title: str = Field(min_length=5, max_length=240)
    learning_objective: str = Field(min_length=15, max_length=1600)
    synthetic_patient: Literal[True] = True
    synthetic_patient_id: str = Field(pattern=r"^SYN-[A-Z0-9-]{3,60}$")
    patient_state_before: VitalState
    learner_action: LearnerAction
    patient_state_after: VitalState
    clinical_rationale: str = Field(min_length=20, max_length=2400)
    visual_focus: VisualFocus
    voiceover_language: Literal["tr", "en"] = "tr"
    duration_seconds: int = Field(default=35, ge=20, le=45)
    safety_constraints: list[str] = Field(min_length=2, max_length=16)
    source_references: list[SourceReference] = Field(min_length=1, max_length=12)
    expert_approval_reference: str = Field(min_length=6, max_length=240)
    ucep_alignment_codes: list[str] = Field(default_factory=list, max_length=24)
    horizontal_integration_tags: list[str] = Field(default_factory=list, max_length=16)
    vertical_integration_tags: list[str] = Field(default_factory=list, max_length=16)
    request_render: bool = False

    @field_validator("safety_constraints")
    @classmethod
    def normalize_constraints(cls, values: list[str]) -> list[str]:
        normalized = [value.strip() for value in values if value.strip()]
        if len(normalized) < 2:
            raise ValueError("At least two explicit safety constraints are required")
        if any(len(value) > 500 for value in normalized):
            raise ValueError("Each safety constraint must be 500 characters or fewer")
        return normalized

    @model_validator(mode="after")
    def verify_approved_sources(self) -> "ClinicalSceneRequest":
        if not all(source.approved_for_scenario for source in self.source_references):
            raise ValueError("Every source must be approved for this scenario version")
        return self


class SceneBeat(BaseModel):
    order: int = Field(ge=1, le=8)
    label: str
    duration_seconds: int = Field(ge=1, le=20)
    narration: str
    visible_elements: list[str]
    state_transition: str


class ClinicalScenePlan(BaseModel):
    scene_title: str
    visualization_type: str
    duration_seconds: int
    beats: list[SceneBeat]
    debrief_question: str
    source_and_approval_footer: str
    generated_by: Literal["deterministic", "upstream_ai"]


class ValidationReport(BaseModel):
    syntax_valid: bool
    spatial_valid: bool
    voiceover_valid: bool
    security_valid: bool
    import_tested: bool = False
    import_test_passed: bool | None = None
    issues: list[str] = Field(default_factory=list)
    fixes: list[str] = Field(default_factory=list)

    @property
    def passed(self) -> bool:
        return (
            self.syntax_valid
            and self.spatial_valid
            and self.voiceover_valid
            and self.security_valid
            and (self.import_test_passed is not False)
        )


class GeneratedArtifact(BaseModel):
    scene_class_name: str
    manim_code: str
    narration_lines: list[str] = Field(default_factory=list)
    validation: ValidationReport
    video_url: str | None = None


class SceneJob(BaseModel):
    job_id: str
    status: JobStatus
    progress: float = Field(ge=0, le=1)
    created_at: datetime
    updated_at: datetime
    scenario_id: str
    mode: EngineMode
    plan: ClinicalScenePlan | None = None
    artifact: GeneratedArtifact | None = None
    error: str | None = None

    @classmethod
    def new(cls, job_id: str, request: ClinicalSceneRequest, mode: EngineMode) -> "SceneJob":
        now = datetime.now(timezone.utc)
        return cls(
            job_id=job_id,
            status=JobStatus.QUEUED,
            progress=0,
            created_at=now,
            updated_at=now,
            scenario_id=request.scenario_id,
            mode=mode,
        )


class EngineCapabilities(BaseModel):
    service: str = "TEYS/MAMS Medical Simulation Engine"
    api_version: str = "v1"
    requested_mode: EngineMode
    effective_mode: EngineMode
    upstream_present: bool
    upstream_commit: str | None
    llm_configured: bool
    renderer_available: bool
    render_enabled: bool
    raw_code_endpoint_exposed: Literal[False] = False
    supported_modules: list[int] = Field(default_factory=lambda: list(range(1, 9)))
    visual_focuses: list[VisualFocus] = Field(default_factory=lambda: list(VisualFocus))
    curriculum_composition: dict[str, int] = Field(
        default_factory=lambda: {"ucep_referenced_core": 70, "institutional_autonomy": 30}
    )
    persistence: str = "in_memory_controlled_pilot"
    safety_boundary: str = "synthetic educational simulation only; not clinical decision support"


class EngineHealth(BaseModel):
    status: Literal["ok", "degraded"]
    timestamp: datetime
    capabilities: EngineCapabilities
    checks: dict[str, Any]
