from __future__ import annotations

import json
import re
import textwrap
from typing import Any

from .schemas import MedicalSceneRequest


MODULE_TITLES = {
    1: "Sanal Hasta",
    2: "Olguya Dayalı Öğrenme",
    3: "Klinik Akıl Yürütme",
    4: "Tanı ve Tetkik",
    5: "Tedavi ve Müdahale",
    6: "Acil Durum Simülasyonları",
    7: "Ekip Yönetimi & Klinik Liderlik",
    8: "Entegre Klinik Simülasyon",
}


def _label(value: str, maximum: int = 62) -> str:
    value = re.sub(r"\s+", " ", value).strip()
    if len(value) > maximum:
        value = value[: maximum - 1].rstrip() + "…"
    return value


def _py(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def _multiline(value: str, width: int, maximum_lines: int = 2) -> str:
    value = re.sub(r"\s+", " ", value).strip()
    lines = textwrap.wrap(value, width=width, break_long_words=False, break_on_hyphens=False)
    if len(lines) > maximum_lines:
        lines = lines[:maximum_lines]
        lines[-1] = _label(lines[-1], max(4, width - 1))
        if not lines[-1].endswith("…"):
            lines[-1] = lines[-1].rstrip(" .") + "…"
    return "\n".join(lines) or "—"


def build_storyboard(request: MedicalSceneRequest) -> list[dict[str, Any]]:
    before = request.patient_state_before
    after = request.patient_state_after
    return [
        {
            "order": 1,
            "duration_seconds": 5,
            "description": "Sentetik hasta durumu ve karar noktası",
            "narration": "Öğrenci, klinik durumun başlangıç bulgularını gözlemler.",
        },
        {
            "order": 2,
            "duration_seconds": 6,
            "description": f"Öğrenci eylemi: {request.learner_action.label}",
            "narration": request.clinical_rationale,
        },
        {
            "order": 3,
            "duration_seconds": 8,
            "description": (
                f"Vital geçiş: HR {before.heart_rate}→{after.heart_rate}, "
                f"SpO₂ {before.spo2}→{after.spo2}, "
                f"TA {before.systolic_bp}/{before.diastolic_bp}→"
                f"{after.systolic_bp}/{after.diastolic_bp}"
            ),
            "narration": "Onaylanmış olay sözleşmesindeki fizyolojik sonuç görünür hâle gelir.",
        },
        {
            "order": 4,
            "duration_seconds": 6,
            "description": f"Kritik sinyal: {request.critical_signal}",
            "narration": "Kritik veri, öğrencinin yeniden değerlendirmesi için vurgulanır.",
        },
        {
            "order": 5,
            "duration_seconds": 5,
            "description": f"Debrief sorusu: {request.debrief_question}",
            "narration": "Sahne, yansıtıcı debriefing sorusuyla kapanır.",
        },
    ]


def deterministic_scene_code(request: MedicalSceneRequest) -> tuple[str, str]:
    before = request.patient_state_before
    after = request.patient_state_after
    module = MODULE_TITLES[request.module_id]
    action = _multiline(request.learner_action.label, 38)
    critical = _multiline(request.critical_signal, 55)
    question = _multiline(request.debrief_question, 57)
    before_signs = _multiline(", ".join(before.visible_signs[:3]) or "Başlangıç bulguları", 34)
    after_signs = _multiline(", ".join(after.visible_signs[:3]) or "Müdahale sonrası bulgular", 34)
    class_name = f"TEYSMedicalScene{request.module_id}"

    code = f'''from manim import *

class {class_name}(Scene):
    def construct(self):
        self.camera.background_color = "#07111B"
        NAVY = "#0D1B28"
        CYAN = "#3CCBF4"
        GREEN = "#35D39A"
        AMBER = "#F1B34B"
        RED = "#ED4E57"
        WHITE = "#EDF5FB"
        MUTED = "#92A8B8"

        title = Text({_py("TEYS · " + module)}, font_size=34, color=WHITE, weight=BOLD)
        subtitle = Text({_py("SENTETİK HASTA · KONTROLLÜ EĞİTİM SİMÜLASYONU")}, font_size=16, color=CYAN)
        header = VGroup(title, subtitle).arrange(DOWN, aligned_edge=LEFT, buff=0.12).to_edge(UP, buff=0.28)

        patient_panel = RoundedRectangle(width=5.8, height=4.9, corner_radius=0.22, color="#24465C", fill_color=NAVY, fill_opacity=1)
        patient_panel.shift(LEFT * 3.6 + DOWN * 0.35)
        monitor_panel = RoundedRectangle(width=6.5, height=4.9, corner_radius=0.22, color="#24465C", fill_color="#061018", fill_opacity=1)
        monitor_panel.shift(RIGHT * 3.0 + DOWN * 0.35)

        bed = RoundedRectangle(width=4.6, height=0.85, corner_radius=0.2, color="#B8C6CC", fill_color="#B8C6CC", fill_opacity=1)
        bed.move_to(patient_panel.get_center() + DOWN * 1.15)
        head = Circle(radius=0.45, color="#D9A98C", fill_color="#D9A98C", fill_opacity=1)
        head.move_to(patient_panel.get_center() + LEFT * 1.55 + UP * 0.1)
        torso = RoundedRectangle(width=2.5, height=1.15, corner_radius=0.35, color="#C7D4D8", fill_color="#C7D4D8", fill_opacity=1)
        torso.next_to(head, RIGHT, buff=0.05).shift(DOWN * 0.12)
        patient = VGroup(bed, head, torso)

        before_label = Text({_py(before_signs)}, font_size=15, color=AMBER, line_spacing=0.75)
        before_label.set_max_width(5.0)
        before_label.next_to(patient_panel.get_top(), DOWN, buff=0.35)
        action_label = Text({_py(action)}, font_size=16, color=WHITE, weight=BOLD, line_spacing=0.72)
        action_label.set_max_width(4.65)
        action_box = RoundedRectangle(width=5.1, height=0.78, corner_radius=0.16, color=CYAN, fill_color="#123447", fill_opacity=1)
        action_box.move_to(patient_panel.get_center() + UP * 1.25)
        action_label.move_to(action_box.get_center())

        monitor_title = Text("CANLI MONİTÖR", font_size=18, color=MUTED, weight=BOLD)
        monitor_title.next_to(monitor_panel.get_top(), DOWN, buff=0.28).align_to(monitor_panel, LEFT).shift(RIGHT * 0.3)
        ecg_baseline = Line(LEFT * 2.75, RIGHT * 2.75, color="#163A31", stroke_width=1)
        ecg_baseline.move_to(monitor_panel.get_center() + UP * 0.75)
        trace = VMobject(color=GREEN, stroke_width=4)
        points = []
        for i in range(57):
            x = -2.75 + i * 0.1
            cycle = i % 9
            y = 0.0
            if cycle == 3: y = 0.12
            elif cycle == 4: y = -0.18
            elif cycle == 5: y = 0.72
            elif cycle == 6: y = -0.42
            elif cycle == 7: y = 0.12
            points.append(ecg_baseline.get_center() + RIGHT * x + UP * y)
        trace.set_points_as_corners(points)

        # Text is used intentionally instead of DecimalNumber. DecimalNumber
        # creates Tex glyphs and therefore introduces an unnecessary LaTeX
        # runtime dependency for simple clinical monitor values.
        hr = Text({_py(str(before.heart_rate))}, font_size=38, color=GREEN, weight=BOLD)
        spo2 = Text({_py(str(before.spo2))}, font_size=38, color=CYAN, weight=BOLD)
        sys = Text({_py(str(before.systolic_bp))}, font_size=32, color=WHITE, weight=BOLD)
        slash = Text("/", font_size=26, color=MUTED)
        dia = Text({_py(str(before.diastolic_bp))}, font_size=32, color=WHITE, weight=BOLD)
        rr = Text({_py(str(before.respiratory_rate))}, font_size=38, color=AMBER, weight=BOLD)
        bp_value = VGroup(sys, slash, dia).arrange(RIGHT, buff=0.08)
        labels = VGroup(
            Text("HR /dk", font_size=14, color=MUTED),
            Text("SpO₂ %", font_size=14, color=MUTED),
            Text("TA mmHg", font_size=14, color=MUTED),
            Text("SS /dk", font_size=14, color=MUTED),
        ).arrange(RIGHT, buff=0.95)
        values = VGroup(hr, spo2, bp_value, rr).arrange(RIGHT, buff=0.65)
        values.next_to(monitor_panel.get_bottom(), UP, buff=0.55)
        labels.next_to(values, UP, buff=0.16)

        footer = Text({_py("Onay referansı: " + _label(request.expert_approval_reference, 62))}, font_size=13, color=MUTED)
        footer.to_edge(DOWN, buff=0.18)

        self.play(FadeIn(header, shift=DOWN * 0.15), run_time=0.7)
        self.play(Create(patient_panel), Create(monitor_panel), FadeIn(patient), run_time=0.8)
        self.play(FadeIn(before_label), FadeIn(monitor_title), Create(ecg_baseline), Create(trace), FadeIn(labels), FadeIn(values), FadeIn(footer), run_time=1.0)
        self.play(torso.animate.scale(1.06).shift(UP * 0.04), rate_func=there_and_back, run_time=1.0)
        self.play(Create(action_box), Write(action_label), run_time=0.8)
        self.wait(0.6)

        consequence = Text({_py(after_signs)}, font_size=15, color=GREEN if {after.systolic_bp} >= {before.systolic_bp} and {after.spo2} >= {before.spo2} else RED, line_spacing=0.75)
        consequence.set_max_width(5.0)
        consequence.move_to(before_label.get_center())
        hr_after = Text({_py(str(after.heart_rate))}, font_size=38, color=GREEN, weight=BOLD).move_to(hr.get_center())
        spo2_after = Text({_py(str(after.spo2))}, font_size=38, color=CYAN, weight=BOLD).move_to(spo2.get_center())
        bp_after = VGroup(
            Text({_py(str(after.systolic_bp))}, font_size=32, color=WHITE, weight=BOLD),
            Text("/", font_size=26, color=MUTED),
            Text({_py(str(after.diastolic_bp))}, font_size=32, color=WHITE, weight=BOLD),
        ).arrange(RIGHT, buff=0.08).move_to(bp_value.get_center())
        rr_after = Text({_py(str(after.respiratory_rate))}, font_size=38, color=AMBER, weight=BOLD).move_to(rr.get_center())
        self.play(
            Transform(before_label, consequence),
            Transform(hr, hr_after),
            Transform(spo2, spo2_after),
            Transform(bp_value, bp_after),
            Transform(rr, rr_after),
            torso.animate.scale(0.96),
            run_time=2.0,
        )

        signal_box = RoundedRectangle(width=11.9, height=0.9, corner_radius=0.15, color=RED, fill_color="#3A1820", fill_opacity=0.95)
        signal_box.to_edge(DOWN, buff=0.72)
        signal = Text({_py("KRİTİK SİNYAL · " + critical)}, font_size=15, color=WHITE, weight=BOLD, line_spacing=0.72)
        signal.set_max_width(11.1)
        signal.move_to(signal_box.get_center())
        self.play(FadeOut(footer), Create(signal_box), Write(signal), run_time=0.9)
        self.wait(1.0)

        debrief_box = RoundedRectangle(width=11.9, height=1.05, corner_radius=0.18, color=CYAN, fill_color="#0B2938", fill_opacity=0.98)
        debrief_box.to_edge(DOWN, buff=0.45)
        debrief = Text({_py(question)}, font_size=16, color=WHITE, weight=BOLD, line_spacing=0.72)
        debrief.set_max_width(11.0).move_to(debrief_box.get_center())
        self.play(ReplacementTransform(VGroup(signal_box, signal), VGroup(debrief_box, debrief)), run_time=0.9)
        self.wait(1.4)
'''
    return code, class_name
