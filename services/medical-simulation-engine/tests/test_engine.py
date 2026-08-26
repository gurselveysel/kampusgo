from app.engine import SimulationEngine
from app.models import SessionActionRequest, SessionPhase, SessionStartRequest


def action(action_id: str, rationale: str = "Sentetik eğitim gerekçesi") -> SessionActionRequest:
    return SessionActionRequest(action_id=action_id, rationale=rationale)


def test_correct_anaphylaxis_path_improves_patient_and_passes() -> None:
    engine = SimulationEngine()
    started = engine.start_session(SessionStartRequest())
    session_id = started.id

    engine.apply_action(session_id, action("assess_abcde"))
    engine.apply_action(session_id, action("oxygen_high_flow"))
    epinephrine = engine.apply_action(session_id, action("epinephrine_im_05"))
    assert epinephrine.session.vitals.systolic_bp > started.vitals.systolic_bp
    assert epinephrine.session.vitals.spo2 > started.vitals.spo2

    engine.apply_action(session_id, action("crystalloid_bolus"))
    final = engine.apply_action(session_id, action("reassess"))
    assert final.session.phase == SessionPhase.COMPLETED

    debrief = engine.debrief(session_id)
    assert debrief.passed is True
    assert debrief.overall_score >= debrief.decision_timeline[-1].score_delta
    assert any("Adrenalin" in item for item in debrief.correct_decisions)


def test_unsafe_iv_bolus_creates_critical_error() -> None:
    engine = SimulationEngine()
    started = engine.start_session(SessionStartRequest())
    response = engine.apply_action(started.id, action("iv_epinephrine_bolus"))
    assert response.event.critical is True
    assert response.session.vitals.rhythm == "Geniş kompleks taşiaritmi"
    debrief = engine.debrief(started.id)
    assert debrief.passed is False
    assert debrief.critical_errors


def test_unnecessary_ct_costs_time_and_score() -> None:
    engine = SimulationEngine()
    started = engine.start_session(SessionStartRequest())
    response = engine.apply_action(started.id, action("ct_chest"))
    assert response.session.elapsed_seconds == 300
    assert response.event.score_delta < 0
    assert engine.debrief(started.id).unnecessary_tests
