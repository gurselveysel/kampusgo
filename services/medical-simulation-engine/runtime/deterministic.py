"""Deterministic preview planner and safe Manim scene generator.

This mode makes the API testable without model credentials or a Manim runtime.
It is also the fail-closed fallback when AI/render prerequisites are absent.
"""

from __future__ import annotations

from textwrap import dedent

from .schemas import (
    ClinicalScenePlan,
    ClinicalSceneRequest,
    GeneratedArtifact,
    SceneBeat,
    ValidationReport,
)
from .security import scan_generated_code


def _vital_summary(request: ClinicalSceneRequest, *, after: bool) -> str:
    state = request.patient_state_after if after else request.patient_state_before
    return (
        f"HR {state.heart_rate}/dk, TA {state.systolic_bp}/{state.diastolic_bp} mmHg, "
        f"SpO₂ %{state.spo2}, SS {state.respiratory_rate}/dk, ritim {state.rhythm.value}"
    )


def build_deterministic_plan(request: ClinicalSceneRequest) -> ClinicalScenePlan:
    durations = [6, 6, 8, 6, 5]
    target = request.duration_seconds
    delta = target - sum(durations)
    durations[2] = max(4, durations[2] + delta)

    beats = [
        SceneBeat(
            order=1,
            label="Bağlam",
            duration_seconds=durations[0],
            narration=(
                f"Sentetik hasta başlangıç durumunda {_vital_summary(request, after=False)} "
                "bulgularıyla değerlendirilir."
            ),
            visible_elements=["sentetik hasta etiketi", "hasta silüeti", "canlı vital monitörü"],
            state_transition="Başlangıç durumu sabitlenir; öğrenci karar noktası görünür olur.",
        ),
        SceneBeat(
            order=2,
            label="Öğrenci kararı",
            duration_seconds=durations[1],
            narration=(
                f"Öğrenci {request.learner_action.label.lower()} kararını verir ve gerekçesini "
                "senaryo kaydına ekler."
            ),
            visible_elements=["eylem kartı", "karar zamanı", "gerekçe göstergesi"],
            state_transition=f"Eylem {request.learner_action.timing_seconds}. saniyede uygulanır.",
        ),
        SceneBeat(
            order=3,
            label="Klinik sonuç",
            duration_seconds=durations[2],
            narration=(
                f"Uzman onaylı senaryo geçişi sonrasında {_vital_summary(request, after=True)} "
                "değerleri oluşur."
            ),
            visible_elements=["önce-sonra vital karşılaştırması", "EKG/vital eğrisi", "durum oku"],
            state_transition=request.clinical_rationale,
        ),
        SceneBeat(
            order=4,
            label="Kritik sinyal",
            duration_seconds=durations[3],
            narration=(
                "Öğrencinin dikkatini değiştirmesi beklenen kritik klinik sinyal, dekoratif "
                "hareketlerden ayrılarak vurgulanır."
            ),
            visible_elements=[request.visual_focus.value, "kritik sinyal vurgusu", "zaman çizgisi"],
            state_transition="Kararı değiştiren bilgi denetim izine bağlanır.",
        ),
        SceneBeat(
            order=5,
            label="Debriefing",
            duration_seconds=durations[4],
            narration=(
                "Son kare, kararın hasta sonucuna etkisini ve bir sonraki denemede gözden "
                "geçirilmesi gereken noktayı sorgular."
            ),
            visible_elements=["debrief sorusu", "kaynak ve uzman onayı", "yeniden dene çağrısı"],
            state_transition="Öğrenci yansıtıcı değerlendirmeye yönlendirilir.",
        ),
    ]

    references = ", ".join(
        f"{source.source_id} ({source.version})" for source in request.source_references
    )
    return ClinicalScenePlan(
        scene_title=request.scene_title,
        visualization_type=request.visual_focus.value,
        duration_seconds=sum(beat.duration_seconds for beat in beats),
        beats=beats,
        debrief_question=(
            "Hangi klinik bilgi kararını değiştirmeliydi ve aynı durumda bir sonraki "
            "denemede neyi farklı yaparsın?"
        ),
        source_and_approval_footer=(
            f"Sentetik eğitim senaryosu · Kaynaklar: {references} · "
            f"Uzman onayı: {request.expert_approval_reference}"
        ),
        generated_by="deterministic",
    )


def _safe_text(value: str, maximum: int = 78) -> str:
    compact = " ".join(value.replace("\n", " ").split())
    if len(compact) > maximum:
        compact = compact[: maximum - 1].rstrip() + "…"
    return compact


def build_deterministic_manim_code(
    request: ClinicalSceneRequest,
    plan: ClinicalScenePlan,
) -> tuple[str, str]:
    """Generate bounded, network-free Manim code for preview and CI validation."""
    before = request.patient_state_before
    after = request.patient_state_after
    class_name = "TeysClinicalScene"

    title = repr(_safe_text(request.scene_title, 64))
    objective = repr(_safe_text(request.learning_objective, 72))
    action = repr(_safe_text(request.learner_action.label, 56))
    debrief = repr(_safe_text(plan.debrief_question, 88))
    approval = repr(_safe_text(plan.source_and_approval_footer, 96))

    code = dedent(
        f'''
        from manim import *
        import numpy as np


        class {class_name}(Scene):
            """Synthetic, expert-approved TEYS/MAMS educational scene."""

            def monitor_wave(self, baseline: float, amplitude: float, color):
                axes = Axes(
                    x_range=[0, 10, 1],
                    y_range=[-2, 2, 1],
                    x_length=6.0,
                    y_length=1.25,
                    tips=False,
                    axis_config={{"stroke_opacity": 0.18}},
                )
                trace = axes.plot(
                    lambda x: baseline + amplitude * np.sin(4.5 * x),
                    x_range=[0, 10],
                    color=color,
                    stroke_width=3,
                )
                return VGroup(axes, trace)

            def construct(self):
                self.camera.background_color = "#081522"

                title = Text({title}, font_size=34, weight=BOLD, color=WHITE)
                title.to_edge(UP, buff=0.35)
                synthetic = Text(
                    "SENTETİK HASTA · EĞİTİM SİMÜLASYONU",
                    font_size=18,
                    color="#75E6DA",
                )
                synthetic.next_to(title, DOWN, buff=0.22)

                patient_panel = RoundedRectangle(
                    width=5.15,
                    height=4.65,
                    corner_radius=0.24,
                    stroke_color="#35536C",
                    fill_color="#10283A",
                    fill_opacity=0.9,
                ).move_to(LEFT * 3.25 + DOWN * 0.35)

                head = Circle(radius=0.48, color="#F2C6A0", fill_opacity=1)
                torso = RoundedRectangle(
                    width=1.75,
                    height=2.05,
                    corner_radius=0.32,
                    color="#3C7DA6",
                    fill_opacity=0.95,
                ).next_to(head, DOWN, buff=0.08)
                patient = VGroup(head, torso).move_to(patient_panel.get_center() + LEFT * 1.25)
                breath = Ellipse(
                    width=1.2,
                    height=0.55,
                    color="#75E6DA",
                    stroke_opacity=0.75,
                ).move_to(torso.get_center() + UP * 0.28)

                before_label = Text("Başlangıç", font_size=21, color="#F7C873")
                before_label.move_to(patient_panel.get_top() + DOWN * 0.38 + RIGHT * 1.22)
                before_vitals = VGroup(
                    Text("HR {before.heart_rate}/dk", font_size=20, color=WHITE),
                    Text("TA {before.systolic_bp}/{before.diastolic_bp}", font_size=20, color=WHITE),
                    Text("SpO₂ %{before.spo2}", font_size=20, color=WHITE),
                    Text("SS {before.respiratory_rate}/dk", font_size=20, color=WHITE),
                    Text("{_safe_text(before.rhythm.value, 25)}", font_size=18, color="#F7C873"),
                ).arrange(DOWN, aligned_edge=LEFT, buff=0.22)
                before_vitals.next_to(before_label, DOWN, buff=0.28)

                monitor_panel = RoundedRectangle(
                    width=6.85,
                    height=4.65,
                    corner_radius=0.24,
                    stroke_color="#35536C",
                    fill_color="#061119",
                    fill_opacity=0.96,
                ).move_to(RIGHT * 2.85 + DOWN * 0.35)
                monitor_title = Text("KLİNİK SONUÇ", font_size=21, color="#41F5A7")
                monitor_title.move_to(monitor_panel.get_top() + DOWN * 0.38)
                waveform = self.monitor_wave(0, 0.72, "#41F5A7")
                waveform.move_to(monitor_panel.get_center() + UP * 0.8)

                after_vitals = VGroup(
                    Text("HR {after.heart_rate}/dk", font_size=20, color="#41F5A7"),
                    Text("TA {after.systolic_bp}/{after.diastolic_bp}", font_size=20, color=WHITE),
                    Text("SpO₂ %{after.spo2}", font_size=20, color="#75E6DA"),
                    Text("SS {after.respiratory_rate}/dk", font_size=20, color=WHITE),
                    Text("{_safe_text(after.rhythm.value, 25)}", font_size=18, color="#FF6B6B"),
                ).arrange(RIGHT, buff=0.34)
                after_vitals.scale(0.82).move_to(monitor_panel.get_center() + DOWN * 0.72)

                action_card = RoundedRectangle(
                    width=6.2,
                    height=0.82,
                    corner_radius=0.2,
                    fill_color="#203B54",
                    fill_opacity=0.96,
                    stroke_color="#75E6DA",
                )
                action_text = Text({action}, font_size=22, color=WHITE)
                action_group = VGroup(action_card, action_text).move_to(DOWN * 3.18)

                objective = Text({objective}, font_size=19, color="#B6C6D5")
                objective.next_to(synthetic, DOWN, buff=0.2)

                self.play(FadeIn(title), FadeIn(synthetic), FadeIn(objective), run_time=1.2)
                self.play(Create(patient_panel), FadeIn(patient), Create(breath), run_time=1.4)
                self.play(FadeIn(before_label), FadeIn(before_vitals), run_time=1.0)
                self.play(breath.animate.scale(1.12), rate_func=there_and_back, run_time=1.2)
                self.play(Create(monitor_panel), FadeIn(monitor_title), Create(waveform), run_time=1.5)
                self.play(FadeIn(action_group), run_time=1.0)
                self.play(
                    Indicate(action_group, color="#F7C873"),
                    Transform(before_vitals.copy(), after_vitals),
                    run_time=1.8,
                )
                self.play(FadeIn(after_vitals), run_time=0.8)

                debrief_box = RoundedRectangle(
                    width=11.8,
                    height=1.08,
                    corner_radius=0.22,
                    fill_color="#3A2034",
                    fill_opacity=0.95,
                    stroke_color="#FF6B6B",
                ).move_to(DOWN * 2.72)
                question = Text({debrief}, font_size=19, color=WHITE)
                if question.width > 11.1:
                    question.scale_to_fit_width(11.1)
                question.move_to(debrief_box)
                footer = Text({approval}, font_size=12, color="#8398AA")
                footer.to_edge(DOWN, buff=0.12)

                self.play(ReplacementTransform(action_card, debrief_box), FadeOut(action_text), run_time=1.0)
                self.play(Write(question), FadeIn(footer), run_time=1.4)
                self.wait(1.2)
        '''
    ).strip()
    return class_name, code


def build_deterministic_artifact(
    request: ClinicalSceneRequest,
    plan: ClinicalScenePlan,
) -> GeneratedArtifact:
    class_name, code = build_deterministic_manim_code(request, plan)
    security_issues = scan_generated_code(code)
    validation = ValidationReport(
        syntax_valid=not security_issues,
        spatial_valid=True,
        voiceover_valid=True,
        security_valid=not security_issues,
        issues=security_issues,
        fixes=[],
    )
    return GeneratedArtifact(
        scene_class_name=class_name,
        manim_code=code,
        narration_lines=[beat.narration for beat in plan.beats],
        validation=validation,
    )
