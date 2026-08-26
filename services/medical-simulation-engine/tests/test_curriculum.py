from app.curriculum import build_curriculum, validate_curriculum_portfolio
from app.models import ModuleState


def test_portfolio_is_exactly_70_30() -> None:
    portfolio = validate_curriculum_portfolio()
    assert portfolio.valid is True
    assert portfolio.ucep_percent == 70
    assert portfolio.autonomy_percent == 30
    assert portfolio.total_percent == 100


def test_sequential_gating_unlocks_only_next_module() -> None:
    curriculum = build_curriculum(
        completed_modules=[1, 2, 3, 4, 5],
        competency_scores={1: 80, 2: 80, 3: 80, 4: 80, 5: 80},
        active_module_id=6,
    )
    assert curriculum.modules[5].state == ModuleState.IN_PROGRESS
    assert curriculum.modules[6].state == ModuleState.LOCKED
    assert curriculum.modules[7].state == ModuleState.LOCKED


def test_failed_prerequisite_keeps_next_module_locked() -> None:
    curriculum = build_curriculum(
        completed_modules=[1, 2, 3, 4, 5],
        competency_scores={1: 80, 2: 80, 3: 80, 4: 80, 5: 60},
        active_module_id=6,
    )
    assert curriculum.modules[5].state == ModuleState.LOCKED
    assert "%75" in (curriculum.modules[5].lock_reason or "")
