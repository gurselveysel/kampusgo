"""Pydantic contracts for the TEYS medical simulation service."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


class ModuleState(str, Enum):
    LOCKED = "locked"
    AVAILABLE = "available"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class SessionPhase(str, Enum):
    READY = "ready"
    RUNNING = "running"
    STABILIZED = "stabilized"
    DETERIORATED = "deteriorated"
    COMPLETED = "completed"


class CompetencyLevel(str, Enum):
    NOVICE = "novice"
    DEVELOPING = "developing"
    COMPETENT = "competent"
    ADVANCED = "advanced"


class IntegrationAxis(BaseModel):
    horizontal: list[str] = Field(default_factory=list)
    vertical: list[str] = Field(default_factory=list)


class CurriculumModule(BaseModel):
    id: int = Field(ge=1, le=8)
    code: str
    title: str
    summary: str
    state: ModuleState
    completion_percent: int = Field(ge=0, le=100)
    competency_score: int = Field(ge=0, le=100)
    competency_level: CompetencyLevel
    minimum_success: int = Field(ge=0, le=100)
    skills: list[str]
    scenarios_completed: int = Field(ge=0)
    scenarios_total: int = Field(ge=1)
    next_target: str
    prerequisites: list[int] = Field(default_factory=list)
    lock_reason: str | None = None
    ucep_weight: int = Field(ge=0, le=100)
    autonomy_weight: int = Field(ge=0, le=100)
    integration: IntegrationAxis


class CurriculumPortfolio(BaseModel):
    ucep_percent: int = Field(ge=0, le=100)
    autonomy_percent: int = Field(ge=0, le=100)
    total_percent: int = Field(ge=0, le=100)
    policy: str
    valid: bool


class CurriculumResponse(BaseModel):
    programme: str
    loop: str
    modules: list[CurriculumModule]
    portfolio: CurriculumPortfolio
    active_module_id: int | None = None


class PatientVitals(BaseModel):
    heart_rate: int = Field(ge=0, le=260)
    systolic_bp: int = Field(ge=0, le=260)
    diastolic_bp: int = Field(ge=0, le=180)
    spo2: int = Field(ge=0, le=100)
    respiratory_rate: int = Field(ge=0, le=80)
    temperature_c: float = Field(ge=25, le=45)
    gcs: int = Field(ge=3, le=15)
    pain_score: int = Field(ge=0, le=10)
    rhythm: str = "Sinüs taşikardisi"


class PatientPresentation(BaseModel):
    display_name: str
    age: int = Field(ge=0, le=120)
    sex: Literal["Kadın", "Erkek", "Belirtilmemiş"]
    chief_complaint: str
    appearance: str
    speech: str
    breathing: str
    skin: str
    consciousness: str


class ActionDefinition(BaseModel):
    id: str
    label: str
    category: str
    duration_seconds: int = Field(ge=0, le=900)
    requires_rationale: bool = True
    visible_in_modules: list[int] = Field(default_factory=list)
    risk: Literal["low", "moderate", "high", "critical"] = "low"


class ScenarioSummary(BaseModel):
    id: str
    title: str
    module_id: int = Field(ge=1, le=8)
    difficulty: Literal["Başlangıç", "Orta", "İleri", "Uzman"]
    duration_minutes: int = Field(ge=1)
    ucep_tags: list[str]
    horizontal_integrations: list[str]
    vertical_integrations: list[str]
    minimum_success: int = Field(ge=0, le=100)
    available_actions: list[ActionDefinition]


class SessionStartRequest(BaseModel):
    scenario_id: str = "emergency-anaphylaxis-001"
    learner_id: str = Field(default="demo-learner", min_length=2, max_length=80)
    completed_modules: list[int] = Field(default_factory=lambda: [1, 2, 3, 4, 5])
    competency_scores: dict[int, int] = Field(
        default_factory=lambda: {1: 86, 2: 84, 3: 82, 4: 80, 5: 79}
    )
    synthetic_only: bool = True

    @field_validator("completed_modules")
    @classmethod
    def valid_module_ids(cls, value: list[int]) -> list[int]:
        if any(module_id < 1 or module_id > 8 for module_id in value):
            raise ValueError("Module ids must be between 1 and 8")
        return sorted(set(value))


class SessionActionRequest(BaseModel):
    action_id: str = Field(min_length=2, max_length=100)
    rationale: str = Field(min_length=3, max_length=1000)
    delegated_to: str | None = Field(default=None, max_length=80)
    synthetic_only: bool = True


class SessionEvent(BaseModel):
    sequence: int = Field(ge=1)
    elapsed_seconds: int = Field(ge=0)
    event_type: str
    label: str
    rationale: str | None = None
    delegated_to: str | None = None
    score_delta: int = Field(ge=-100, le=100)
    clinical_effect: str
    vitals_after: PatientVitals
    critical: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SessionView(BaseModel):
    id: str
    scenario: ScenarioSummary
    learner_id: str
    phase: SessionPhase
    elapsed_seconds: int
    score: int = Field(ge=0, le=100)
    competency_level: CompetencyLevel
    minimum_success: int
    patient: PatientPresentation
    vitals: PatientVitals
    initial_vitals: PatientVitals
    active_clues: list[str]
    completed_objectives: list[str]
    missed_or_pending_objectives: list[str]
    actions: list[SessionEvent]
    available_actions: list[ActionDefinition]
    patient_response: str
    next_prompt: str
    synthetic_only: bool = True
    educational_disclaimer: str


class SessionActionResponse(BaseModel):
    accepted: bool
    action: ActionDefinition
    event: SessionEvent
    session: SessionView


class DebriefMetric(BaseModel):
    label: str
    score: int = Field(ge=0, le=100)
    explanation: str


class DebriefQuestion(BaseModel):
    prompt: str
    feedback: str


class DebriefReport(BaseModel):
    session_id: str
    overall_score: int = Field(ge=0, le=100)
    competency_level: CompetencyLevel
    passed: bool
    correct_decisions: list[str]
    incorrect_decisions: list[str]
    critical_errors: list[str]
    missed_clues: list[str]
    unnecessary_tests: list[str]
    delayed_interventions: list[str]
    prioritization_issues: list[str]
    patient_safety_issues: list[str]
    team_communication: list[str]
    leadership_performance: list[str]
    critical_outcome_decisions: list[str]
    decision_timeline: list[SessionEvent]
    metrics: list[DebriefMetric]
    reflective_questions: list[DebriefQuestion]
    next_attempt_target: str
    educational_disclaimer: str


class MedicalStoryboardRequest(BaseModel):
    topic: str = Field(min_length=5, max_length=400)
    module_id: int = Field(default=6, ge=1, le=8)
    audience: str = Field(default="Tıp fakültesi öğrencisi", min_length=3, max_length=160)
    learning_objectives: list[str] = Field(min_length=1, max_length=12)
    ucep_alignment: list[str] = Field(default_factory=list, max_length=20)
    duration_seconds: int = Field(default=45, ge=15, le=60)
    visual_focus: Literal[
        "virtual_patient",
        "clinical_monitor",
        "procedure",
        "team_management",
        "clinical_reasoning",
    ] = "clinical_monitor"
    synthetic_only: bool = True


class StoryboardScene(BaseModel):
    order: int = Field(ge=1, le=20)
    title: str
    duration_seconds: int = Field(ge=1, le=30)
    visual_description: str
    patient_state: str
    monitor_state: str
    learner_decision: str
    narration: str
    clinical_safety_note: str


class MedicalStoryboard(BaseModel):
    topic: str
    module_id: int = Field(ge=1, le=8)
    title: str
    total_duration_seconds: int = Field(ge=15, le=60)
    visual_focus: str
    learning_objectives: list[str]
    ucep_alignment: list[str]
    scenes: list[StoryboardScene]
    source: Literal["upstream-ai", "deterministic-fallback"]
    requires_educator_review: bool = True
    synthetic_only: bool = True


class ManimCodeRequest(BaseModel):
    storyboard: MedicalStoryboard
    voiceover_enabled: bool = True
    tts_service: Literal["gtts", "openai"] = "gtts"
    voice_name: str = Field(default="", max_length=80)
    synthetic_only: bool = True


class ManimCodeResponse(BaseModel):
    scene_class_name: str
    code: str
    dependencies: list[str]
    narration_lines: list[str]
    is_valid: bool
    issues_found: list[str]
    issues_fixed: list[str]
    engine: Literal["upstream-manim-generator", "safe-template-fallback"]
    executable: bool = False
    educator_review_required: bool = True


class MonitorRenderRequest(BaseModel):
    title: str = Field(default="Anafilaksi — Dinamik Klinik Monitör", max_length=120)
    patient_label: str = Field(default="Sentetik Hasta 01", max_length=80)
    before: PatientVitals
    after: PatientVitals
    intervention: str = Field(max_length=160)
    output_slug: str = Field(default="clinical-monitor", pattern=r"^[a-z0-9][a-z0-9-]{1,62}$")
    synthetic_only: bool = True


class MonitorRenderResponse(BaseModel):
    status: Literal["rendered", "unavailable", "failed"]
    video_path: str | None = None
    command: list[str] = Field(default_factory=list)
    detail: str
    elapsed_seconds: float | None = None


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    service: str
    version: str
    upstream_backend_present: bool
    ai_provider_configured: bool
    manim_available: bool
    render_generated_code_enabled: bool
    details: dict[str, Any]
