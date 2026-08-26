"""Authentication, PHI rejection and generated-code sandbox gates."""

from __future__ import annotations

import ast
import hmac
import json
import re
from collections.abc import Iterable

from fastapi import Header, HTTPException, status

from .config import Settings, get_settings
from .schemas import ClinicalSceneRequest


# Deliberately conservative patterns. The API accepts synthetic educational data,
# not a free-text copy of a real chart.
_PHI_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("email address", re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I)),
    ("Turkish identity number", re.compile(r"(?<!\d)[1-9]\d{10}(?!\d)")),
    ("telephone number", re.compile(r"(?<!\d)(?:\+?90\s*)?(?:0?5\d{2})[\s.-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}(?!\d)")),
    ("explicit patient name field", re.compile(r"\b(?:hasta\s+adı|patient\s+name|ad\s*soyad)\s*[:=]", re.I)),
    ("medical record number", re.compile(r"\b(?:protokol|dosya|mrn|medical\s+record)\s*(?:no|numarası|number)?\s*[:=]\s*[A-Z0-9-]{4,}", re.I)),
)

_ALLOWED_IMPORT_ROOTS = {
    "manim",
    "manim_voiceover",
    "numpy",
    "math",
    "random",
    "typing",
}

_BANNED_CALLS = {
    "open",
    "exec",
    "eval",
    "compile",
    "input",
    "__import__",
    "breakpoint",
}

_BANNED_ATTRIBUTE_ROOTS = {
    "os",
    "sys",
    "subprocess",
    "socket",
    "requests",
    "httpx",
    "urllib",
    "pathlib",
    "shutil",
    "pickle",
    "ctypes",
    "multiprocessing",
}


async def require_api_token(
    authorization: str | None = Header(default=None),
) -> None:
    settings = get_settings()
    """Require bearer auth whenever a token is configured or production is active."""
    expected = settings.api_token
    if not expected and not settings.production:
        return
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="MEDICAL_ENGINE_API_TOKEN is required in production",
        )
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer token required",
        )
    supplied = authorization.removeprefix("Bearer ").strip()
    if not hmac.compare_digest(supplied, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid bearer token",
        )


def reject_phi(request: ClinicalSceneRequest) -> None:
    """Reject obvious real-patient identifiers before any LLM call or logging."""
    payload = json.dumps(request.model_dump(mode="json"), ensure_ascii=False)
    findings = [label for label, pattern in _PHI_PATTERNS if pattern.search(payload)]
    if findings:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail={
                "code": "possible_phi_detected",
                "message": "Only synthetic or irreversibly anonymized educational cases are accepted.",
                "findings": findings,
            },
        )


def _root_name(node: ast.AST) -> str | None:
    current = node
    while isinstance(current, ast.Attribute):
        current = current.value
    if isinstance(current, ast.Name):
        return current.id
    return None


def scan_generated_code(code: str) -> list[str]:
    """Static deny-by-default scan before code reaches an isolated render worker."""
    issues: list[str] = []
    try:
        tree = ast.parse(code)
    except SyntaxError as exc:
        return [f"Generated code is not valid Python: line {exc.lineno}: {exc.msg}"]

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                root = alias.name.split(".", 1)[0]
                if root not in _ALLOWED_IMPORT_ROOTS:
                    issues.append(f"Import is not allow-listed: {alias.name}")
        elif isinstance(node, ast.ImportFrom):
            root = (node.module or "").split(".", 1)[0]
            if root not in _ALLOWED_IMPORT_ROOTS:
                issues.append(f"Import is not allow-listed: {node.module or '<relative>'}")
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name) and node.func.id in _BANNED_CALLS:
                issues.append(f"Banned function call: {node.func.id}()")
            root = _root_name(node.func)
            if root in _BANNED_ATTRIBUTE_ROOTS:
                issues.append(f"Banned module access: {root}")
        elif isinstance(node, ast.Attribute):
            root = _root_name(node)
            if root in _BANNED_ATTRIBUTE_ROOTS:
                issues.append(f"Banned module access: {root}")

    # Dunder attribute access is unnecessary for a Manim scene and expands the attack surface.
    for match in re.finditer(r"\.__[A-Za-z0-9_]+__", code):
        issues.append(f"Dunder attribute access is not allowed: {match.group(0)}")

    # De-duplicate while preserving stable feedback order.
    return list(dict.fromkeys(issues))


def join_issues(groups: Iterable[Iterable[str]]) -> list[str]:
    flattened: list[str] = []
    for group in groups:
        flattened.extend(group)
    return list(dict.fromkeys(flattened))
