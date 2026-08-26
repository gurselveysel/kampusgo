FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8080 \
    TEYS_UPSTREAM_BACKEND=/app/visual-lab-upstream/backend \
    MEDICAL_RENDER_ROOT=/app/media/renders \
    ALLOW_GENERATED_MANIM_EXECUTION=0

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libcairo2-dev \
    libpango1.0-dev \
    pkg-config \
    build-essential \
    python3-dev \
    texlive-latex-base \
    texlive-latex-extra \
    texlive-fonts-recommended \
    dvisvgm \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY services/medical-simulation-engine/pyproject.toml services/medical-simulation-engine/README.md ./
COPY services/medical-simulation-engine/app ./app
COPY services/visual-lab/upstream/arxivisual/backend ./visual-lab-upstream/backend
COPY services/medical-simulation-engine/UPSTREAM_COMMIT services/medical-simulation-engine/UPSTREAM_SOURCE.md ./
RUN pip install .
RUN mkdir -p /app/media/renders && useradd --create-home --uid 10001 simulator \
    && chown -R simulator:simulator /app
USER simulator

EXPOSE 8080
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
