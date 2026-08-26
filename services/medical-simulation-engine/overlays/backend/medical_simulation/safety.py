"""Fail-closed checks for AI-generated Manim source before execution."""

from __future__ import annotations

import ast


ALLOWED_IMPORT_ROOTS = {"manim", "manim_voiceover", "math", "numpy"}
BLOCKED_NAMES = {
    "breakpoint",
    "compile",
    "eval",
    "exec",
    "globals",
    "input",
    "locals",
    "open",
    "vars",
    "__import__",
}
BLOCKED_ATTRIBUTES = {
    "__bases__",
    "__class__",
    "__dict__",
    "__globals__",
    "__mro__",
    "__subclasses__",
    "chmod",
    "connect",
    "delete",
    "download",
    "getenv",
    "popen",
    "read_bytes",
    "read_text",
    "remove",
    "rename",
    "replace",
    "request",
    "rmdir",
    "run",
    "send",
    "socket",
    "spawn",
    "system",
    "unlink",
    "upload",
    "write_bytes",
    "write_text",
}


class GeneratedCodeRejected(ValueError):
    """Raised when generated source crosses the render sandbox contract."""


def validate_generated_code(code: str) -> None:
    """Reject filesystem, network, process, reflection and unbounded constructs."""

    if not code.strip():
        raise GeneratedCodeRejected("Generated code is empty.")
    if len(code.encode("utf-8")) > 80_000:
        raise GeneratedCodeRejected("Generated code exceeds the 80 KB limit.")

    try:
        tree = ast.parse(code)
    except SyntaxError as exc:
        raise GeneratedCodeRejected(f"Generated code has invalid syntax: {exc.msg}.") from exc

    nodes = list(ast.walk(tree))
    if len(nodes) > 12_000:
        raise GeneratedCodeRejected("Generated code is structurally too large.")

    issues: list[str] = []
    scene_class_found = False

    for node in nodes:
        if isinstance(node, ast.Import):
            for alias in node.names:
                root = alias.name.split(".", 1)[0]
                if root not in ALLOWED_IMPORT_ROOTS:
                    issues.append(f"import '{root}' is not allowed")
        elif isinstance(node, ast.ImportFrom):
            root = (node.module or "").split(".", 1)[0]
            if node.level or root not in ALLOWED_IMPORT_ROOTS:
                issues.append(f"import from '{node.module or 'relative module'}' is not allowed")
        elif isinstance(node, ast.Name) and node.id in BLOCKED_NAMES:
            issues.append(f"name '{node.id}' is not allowed")
        elif isinstance(node, ast.Attribute) and node.attr in BLOCKED_ATTRIBUTES:
            issues.append(f"attribute '{node.attr}' is not allowed")
        elif isinstance(node, (ast.While, ast.AsyncFor, ast.AsyncFunctionDef, ast.Await)):
            issues.append(f"construct '{type(node).__name__}' is not allowed")
        elif isinstance(node, ast.ClassDef):
            base_names = {
                base.id
                for base in node.bases
                if isinstance(base, ast.Name)
            }
            if base_names.intersection({"Scene", "ThreeDScene", "VoiceoverScene"}):
                scene_class_found = True

    for statement in tree.body:
        if isinstance(statement, ast.Expr) and isinstance(statement.value, ast.Call):
            issues.append("top-level function calls are not allowed")

    if not scene_class_found:
        issues.append("a Manim Scene class is required")

    if issues:
        unique = list(dict.fromkeys(issues))
        raise GeneratedCodeRejected("; ".join(unique[:8]))
