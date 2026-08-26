FROM python:3.13-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ffmpeg \
    libcairo2-dev \
    libpango1.0-dev \
    pkg-config \
    fonts-dejavu-core \
    sox \
    && rm -rf /var/lib/apt/lists/*

FROM base AS dependencies
WORKDIR /build
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
COPY vendor/arxivisual-backend/pyproject.toml vendor/arxivisual-backend/uv.lock ./
ENV UV_PROJECT_ENVIRONMENT=/opt/teys-medical-venv
RUN uv sync \
      --python /usr/local/bin/python \
      --no-dev \
      --frozen \
      --no-install-project && \
    test -x /opt/teys-medical-venv/bin/python && \
    test -x /opt/teys-medical-venv/bin/manim && \
    test -x /opt/teys-medical-venv/bin/uvicorn

FROM base AS runtime
ARG APP_UID=10001
ARG APP_GID=10001
RUN groupadd --gid ${APP_GID} teys && \
    useradd --uid ${APP_UID} --gid ${APP_GID} --create-home teys

WORKDIR /app
COPY --from=dependencies /opt/teys-medical-venv /opt/teys-medical-venv
COPY --chown=teys:teys vendor/arxivisual-backend/ /opt/arxivisual/
COPY --chown=teys:teys runtime/ /app/
COPY --chown=teys:teys prompts/ /app/clinical-prompts/

RUN rm -f /opt/arxivisual/arxiviz.db* && \
    mkdir -p /data/jobs /data/media /data/voiceovers && \
    chown -R teys:teys /data /home/teys

ENV PATH="/opt/teys-medical-venv/bin:$PATH" \
    PYTHONPATH="/app:/opt/arxivisual" \
    PYTHONUNBUFFERED="1" \
    ENVIRONMENT="production" \
    TEYS_ENGINE_DATA_DIR="/data" \
    TEYS_ENGINE_JOBS_DIR="/data/jobs" \
    MEDIA_DIR="/data/media" \
    VOICEOVER_CACHE_DIR="/data/voiceovers" \
    MEDICAL_AI_MODE="auto" \
    MEDICAL_VOICEOVER_ENABLED="false" \
    RENDER_MODE="local"

USER teys
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=10s --start-period=50s --retries=3 \
  CMD python -c "import httpx; r=httpx.get('http://127.0.0.1:8000/api/medical/health', timeout=5); r.raise_for_status()"

CMD ["sh", "-c", "uvicorn medical_engine.app:app --host 0.0.0.0 --port ${PORT:-8000}"]
