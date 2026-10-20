"""Offline fail-closed checks for the generated-scene AST boundary."""

from .pipeline import _safe_code


SAFE_SCENE = """from manim import *

class Safe(Scene):
    def construct(self):
        self.play(Create(Circle()))
"""

BLOCKED_SCENES = [
    """from manim import *
import os
class X(Scene):
    def construct(self):
        pass
""",
    """from manim import *
class X(Scene):
    def construct(self):
        while True:
            pass
""",
    """from manim import *
open("secret")
class X(Scene):
    def construct(self):
        pass
""",
]


def main() -> None:
    _safe_code(SAFE_SCENE)
    for source in BLOCKED_SCENES:
        try:
            _safe_code(source)
        except ValueError:
            continue
        raise SystemExit("unsafe generated scene was accepted")
    print("medical runtime safety contract: OK")


if __name__ == "__main__":
    main()
