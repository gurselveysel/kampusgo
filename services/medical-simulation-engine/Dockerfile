# TEYS/MAMS medical simulation render worker
# The image includes Manim's native dependencies and runs generated code only
# after the structured-request, validation and allow-list gates in runtime/.
FROM python:3.13-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    ENVIRONMENT=production \
    MEDICAL_ENGINE_MODE=preview \
    MEDICAL_ENGINE_ALLOW_RENDER=0 \
    RENDER_MODE=local \
    STORAGE_MODE=local

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ffmpeg \
    libcairo2-dev \
    libpango1.0-dev \
    pkg-config \
    sox \
    texlive-latex-base \
    texlive-fonts-recommended \
    texlive-latex-extra \
    cm-super \
    dvipng \
    dvisvgm \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /service
COPY pyproject.toml ./
COPY runtime ./runtime
COPY prompts ./prompts
COPY UPSTREAM_COMMIT UPSTREAM_SOURCE.md ./
COPY vendor/arxivisual-backend ./vendor/arxivisual-backend

RUN python -m pip install --no-cache-dir ".[render]" \
    && useradd --create-home --uid 10001 --shell /usr/sbin/nologin medsim \
    && mkdir -p /data/videos /tmp/teys-render \
    && chown -R medsim:medsim /service /data/videos /tmp/teys-render

USER medsim
ENV MEDIA_DIR=/data/videos \
    TMPDIR=/tmp/teys-render

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=8s --start-period=45s --retries=3 \
    CMD python -c "import httpx; response=httpx.get('http://127.0.0.1:8000/health', timeout=5); response.raise_for_status()" || exit 1

CMD ["sh", "-c", "uvicorn runtime.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
