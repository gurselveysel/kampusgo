#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
IMAGE_NAME="${VISUAL_LAB_SMOKE_IMAGE:-kampusgo-visual-lab:smoke}"
CONTAINER_NAME="${VISUAL_LAB_SMOKE_CONTAINER:-kampusgo-visual-lab-smoke}"
HOST_PORT="${VISUAL_LAB_SMOKE_PORT:-18001}"
API_KEY="${VISUAL_LAB_SMOKE_API_KEY:-visual-lab-smoke-key-0123456789abcdef}"
BASE_URL="http://127.0.0.1:${HOST_PORT}"

cleanup() {
  docker logs "$CONTAINER_NAME" > /tmp/visual-lab-smoke.log 2>&1 || true
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true

echo "Building Visual Lab pilot image..."
docker build \
  --file "$ROOT_DIR/services/visual-lab/Dockerfile.pilot" \
  --tag "$IMAGE_NAME" \
  "$ROOT_DIR/services/visual-lab"

echo "Starting isolated smoke container..."
docker run --detach \
  --name "$CONTAINER_NAME" \
  --publish "127.0.0.1:${HOST_PORT}:8000" \
  --cap-drop ALL \
  --security-opt no-new-privileges:true \
  --pids-limit 256 \
  --memory 4g \
  --cpus 2 \
  --tmpfs /tmp:rw,nosuid,size=1073741824 \
  --env ENVIRONMENT=production \
  --env LOG_LEVEL=INFO \
  --env VISUAL_LAB_API_KEY="$API_KEY" \
  --env VISUAL_LAB_ALLOW_UNAUTHENTICATED=false \
  --env VISUAL_LAB_RAW_RENDER_ENABLED=false \
  --env VISUAL_LAB_DOCS_ENABLED=false \
  --env DATABASE_URL=sqlite+aiosqlite:////tmp/visual-lab-smoke.db \
  --env STORAGE_MODE=local \
  --env MEDIA_DIR=/tmp/visual-lab-media \
  --env VOICEOVER_CACHE_DIR=/tmp/visual-lab-voiceovers \
  --env RENDER_MODE=local \
  --env USE_TEMPORAL=0 \
  --env PIPELINE_CONCURRENCY=1 \
  --env RENDER_CONCURRENCY=1 \
  --env RATE_LIMIT_PROCESS_PER_IP=3 \
  --env RATE_LIMIT_PROCESS_GLOBAL=3 \
  --env RATE_LIMIT_PROCESS_WINDOW_SECONDS=3600 \
  --env PROCESS_DEDUPE_TTL_SECONDS=7200 \
  "$IMAGE_NAME" >/dev/null

for attempt in $(seq 1 90); do
  if curl --silent --fail "$BASE_URL/api/health" >/tmp/visual-lab-health.json; then
    break
  fi

  if ! docker inspect --format '{{.State.Running}}' "$CONTAINER_NAME" 2>/dev/null | grep -q '^true$'; then
    echo "Visual Lab container exited before becoming healthy." >&2
    docker logs "$CONTAINER_NAME" >&2 || true
    exit 1
  fi

  if [[ "$attempt" == "90" ]]; then
    echo "Visual Lab did not become healthy within 180 seconds." >&2
    docker logs "$CONTAINER_NAME" >&2 || true
    exit 1
  fi
  sleep 2
done

unauthorized_status="$(curl --silent --output /tmp/visual-lab-unauthorized.json --write-out '%{http_code}' "$BASE_URL/api/papers")"
[[ "$unauthorized_status" == "401" ]] || {
  echo "Expected /api/papers without a key to return 401; received $unauthorized_status." >&2
  cat /tmp/visual-lab-unauthorized.json >&2 || true
  exit 1
}

curl --silent --fail \
  --header "X-Visual-Lab-Key: $API_KEY" \
  "$BASE_URL/api/pilot" >/tmp/visual-lab-pilot.json

python - <<'PY'
import json
from pathlib import Path

health = json.loads(Path('/tmp/visual-lab-health.json').read_text())
pilot = json.loads(Path('/tmp/visual-lab-pilot.json').read_text())

assert isinstance(health, dict), health
assert pilot['service'] == 'kampusgo-visual-lab', pilot
assert pilot['mode'] == 'controlled_pilot', pilot
assert pilot['rawRenderEnabled'] is False, pilot
assert pilot['sourceRightsConfirmationRequired'] is True, pilot
assert pilot['authenticationRequired'] is True, pilot
assert pilot['productionAllowed'] is False, pilot
PY

rights_status="$(curl --silent --output /tmp/visual-lab-rights.json --write-out '%{http_code}' \
  --header "X-Visual-Lab-Key: $API_KEY" \
  --header 'Content-Type: application/json' \
  --data '{"arxiv_id":"1706.03762"}' \
  "$BASE_URL/api/process")"
[[ "$rights_status" == "428" ]] || {
  echo "Expected process without rights confirmation to return 428; received $rights_status." >&2
  cat /tmp/visual-lab-rights.json >&2 || true
  exit 1
}

raw_render_status="$(curl --silent --output /tmp/visual-lab-render.json --write-out '%{http_code}' \
  --header "X-Visual-Lab-Key: $API_KEY" \
  --header 'Content-Type: application/json' \
  --data '{"code":"print(1)"}' \
  "$BASE_URL/api/render")"
[[ "$raw_render_status" == "404" ]] || {
  echo "Expected raw render endpoint to return 404; received $raw_render_status." >&2
  cat /tmp/visual-lab-render.json >&2 || true
  exit 1
}

container_uid="$(docker exec "$CONTAINER_NAME" id -u)"
[[ "$container_uid" != "0" ]] || {
  echo "Visual Lab container is running as root." >&2
  exit 1
}

echo "Visual Lab container smoke test passed."
