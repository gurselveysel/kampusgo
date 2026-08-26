"""Expert-review candidate used only for the offline Manim render smoke test."""

from manim import *


class TEYSApprovedTransition(Scene):
    def construct(self):
        self.camera.background_color = "#081727"

        title = Text("TEYS · Sentetik Klinik Durum Geçişi", font_size=34, color="#EAFBF8")
        title.to_edge(UP, buff=0.35)
        subtitle = Text(
            "VF → erken defibrilasyon + CPR → ROSC",
            font_size=24,
            color="#68E8DD",
        ).next_to(title, DOWN, buff=0.15)

        synthetic = RoundedRectangle(
            width=2.3,
            height=0.42,
            corner_radius=0.12,
            color="#D4A24B",
            fill_color="#D4A24B",
            fill_opacity=0.18,
        ).to_corner(UL, buff=0.35)
        synthetic_text = Text("SENTETİK EĞİTİM HASTASI", font_size=13, color="#FFD88A")
        synthetic_text.move_to(synthetic)

        before_box = RoundedRectangle(
            width=5.2,
            height=3.6,
            corner_radius=0.25,
            color="#C53B47",
            fill_color="#32151E",
            fill_opacity=0.78,
        ).shift(LEFT * 3.25 + DOWN * 0.35)
        after_box = RoundedRectangle(
            width=5.2,
            height=3.6,
            corner_radius=0.25,
            color="#41F5A7",
            fill_color="#0E3028",
            fill_opacity=0.78,
        ).shift(RIGHT * 3.25 + DOWN * 0.35)

        before_title = Text("ÖNCE · VF ARREST", font_size=24, color="#FF9CA6").next_to(
            before_box.get_top(), DOWN, buff=0.33
        )
        after_title = Text("SONRA · ROSC", font_size=24, color="#7EFFBC").next_to(
            after_box.get_top(), DOWN, buff=0.33
        )

        before_vitals = VGroup(
            Text("Ritim  VF", font_size=27, color="#FFFFFF"),
            Text("Nabız  —", font_size=23, color="#D7E3EA"),
            Text("TA  — / —", font_size=23, color="#D7E3EA"),
            Text("SpO₂  %72", font_size=23, color="#D7E3EA"),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.25)
        before_vitals.move_to(before_box).shift(DOWN * 0.25)

        after_vitals = VGroup(
            Text("Ritim  Organize", font_size=27, color="#FFFFFF"),
            Text("Nabız  92/dk", font_size=23, color="#D7E3EA"),
            Text("TA  106 / 68", font_size=23, color="#D7E3EA"),
            Text("SpO₂  %96", font_size=23, color="#D7E3EA"),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.25)
        after_vitals.move_to(after_box).shift(DOWN * 0.25)

        arrow = Arrow(
            before_box.get_right() + RIGHT * 0.18,
            after_box.get_left() + LEFT * 0.18,
            color="#25C8C6",
            stroke_width=7,
            max_tip_length_to_length_ratio=0.22,
        )
        action_badge = RoundedRectangle(
            width=1.22,
            height=0.68,
            corner_radius=0.14,
            color="#25C8C6",
            fill_color="#103A46",
            fill_opacity=1,
        )
        action_badge.next_to(arrow, UP, buff=0.11)
        action = VGroup(
            Text("ERKEN ŞOK", font_size=12, color="#EAFBF8"),
            Text("+ CPR", font_size=11, color="#BFFAF0"),
        ).arrange(DOWN, buff=0.025)
        action.move_to(action_badge)

        footer = Text(
            "Eğitim simülasyonudur · Klinik karar desteği değildir · Onay örneği: TEYS-SYNTHETIC-SMOKE-001",
            font_size=15,
            color="#8EA9B8",
        ).to_edge(DOWN, buff=0.3)

        self.play(FadeIn(title), FadeIn(subtitle), FadeIn(synthetic), FadeIn(synthetic_text))
        self.play(Create(before_box), FadeIn(before_title), FadeIn(before_vitals), run_time=1.2)
        self.play(GrowArrow(arrow), FadeIn(action_badge), FadeIn(action), run_time=1.0)
        self.play(Create(after_box), FadeIn(after_title), FadeIn(after_vitals), run_time=1.3)
        self.play(Indicate(after_vitals, color="#41F5A7", scale_factor=1.03), run_time=1.0)
        self.play(FadeIn(footer))
        self.wait(1.8)
