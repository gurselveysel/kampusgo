#!/usr/bin/env python3
"""Materialize the staged TEYS medical simulation runtime bundle.

The bundle is split into text chunks so it can be staged through the GitHub
contents API. This script validates every archive member before extraction,
then removes the one-time staging payload and itself.
"""

from __future__ import annotations

import base64
import io
import tarfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CHUNK_DIR = ROOT / "scripts" / ".medical-runtime-bundle"
SELF = Path(__file__).resolve()


def _inside_repository(path: Path) -> bool:
    resolved = path.resolve()
    return resolved == ROOT or ROOT in resolved.parents


def main() -> None:
    chunks = sorted(CHUNK_DIR.glob("part-*"))
    if not chunks:
        print("No staged medical runtime bundle found; nothing to materialize.")
        return

    expected_names = [f"part-{index:02d}" for index in range(6)]
    actual_names = [path.name for path in chunks]
    if actual_names != expected_names:
        raise RuntimeError(
            f"Incomplete medical runtime bundle: expected {expected_names}, got {actual_names}"
        )

    encoded = "".join(path.read_text(encoding="utf-8").strip() for path in chunks)
    payload = base64.b64decode(encoded, validate=True)

    with tarfile.open(fileobj=io.BytesIO(payload), mode="r:gz") as archive:
        members = archive.getmembers()
        if not members:
            raise RuntimeError("Medical runtime bundle is empty.")

        for member in members:
            target = ROOT / member.name
            if not _inside_repository(target):
                raise RuntimeError(f"Archive member escapes repository root: {member.name}")
            if member.issym() or member.islnk():
                raise RuntimeError(f"Archive links are not permitted: {member.name}")
            if member.ischr() or member.isblk() or member.isfifo():
                raise RuntimeError(f"Special archive member is not permitted: {member.name}")

        archive.extractall(ROOT, members=members, filter="data")

    for chunk in chunks:
        chunk.unlink()
    CHUNK_DIR.rmdir()
    SELF.unlink()

    print(f"Materialized {len(members)} TEYS medical simulation runtime entries.")


if __name__ == "__main__":
    main()
