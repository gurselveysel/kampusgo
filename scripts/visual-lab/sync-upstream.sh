#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MANIFEST="$ROOT_DIR/services/visual-lab/UPSTREAM.json"

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required." >&2
  exit 1
fi

UPSTREAM_REPOSITORY="$(jq -r '.repository' "$MANIFEST")"
UPSTREAM_REF="$(jq -r '.ref' "$MANIFEST")"
IMPORTED_PATH="$(jq -r '.importedPath' "$MANIFEST")"
TARGET_DIR="$ROOT_DIR/$IMPORTED_PATH"
CHECKSUM_FILE="$ROOT_DIR/services/visual-lab/UPSTREAM_FILES.sha256"

if [[ -z "$UPSTREAM_REPOSITORY" || "$UPSTREAM_REPOSITORY" == "null" ]]; then
  echo "UPSTREAM.json repository is missing." >&2
  exit 1
fi

if [[ ! "$UPSTREAM_REF" =~ ^[0-9a-f]{40}$ ]]; then
  echo "UPSTREAM.json ref must be a full 40-character commit SHA." >&2
  exit 1
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

REPO_DIR="$TMP_DIR/arxivisual"

echo "Cloning $UPSTREAM_REPOSITORY"
git clone --no-tags --filter=blob:none --no-checkout "$UPSTREAM_REPOSITORY" "$REPO_DIR"

git -C "$REPO_DIR" fetch --depth 1 origin "$UPSTREAM_REF"
git -C "$REPO_DIR" checkout --detach "$UPSTREAM_REF"

ACTUAL_REF="$(git -C "$REPO_DIR" rev-parse HEAD)"
if [[ "$ACTUAL_REF" != "$UPSTREAM_REF" ]]; then
  echo "Checked out commit $ACTUAL_REF, expected $UPSTREAM_REF." >&2
  exit 1
fi

# The working tree is copied exactly; only the nested Git metadata is removed.
rm -rf "$REPO_DIR/.git"
rm -rf "$TARGET_DIR"
mkdir -p "$(dirname "$TARGET_DIR")"
mv "$REPO_DIR" "$TARGET_DIR"

# Fail before commit if a source file would exceed GitHub's normal file limit.
while IFS= read -r -d '' file; do
  size="$(stat -c '%s' "$file")"
  if (( size >= 100000000 )); then
    echo "File exceeds 100 MB and cannot be committed without Git LFS: $file" >&2
    exit 1
  fi
done < <(find "$TARGET_DIR" -type f -print0)

# Produce a deterministic integrity manifest outside the upstream working tree.
(
  cd "$TARGET_DIR"
  find . -type f -print0 \
    | LC_ALL=C sort -z \
    | xargs -0 sha256sum
) > "$CHECKSUM_FILE"

echo "Imported $UPSTREAM_REPOSITORY@$UPSTREAM_REF"
echo "Target: $IMPORTED_PATH"
echo "Files: $(find "$TARGET_DIR" -type f | wc -l | tr -d ' ')"
echo "Size: $(du -sh "$TARGET_DIR" | awk '{print $1}')"
