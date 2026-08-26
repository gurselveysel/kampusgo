"""KampüsGO Visual Lab pilot API entry point.

This file overlays the upstream arXivisual ``backend/main.py`` at image build
 time. The upstream source remains pinned and auditable under
``services/visual-lab/upstream/arxivisual``.
"""

from __future__ import annotations

import hmac
import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv

# Environment must be loaded before importing modules that resolve storage,
# database or render configuration at import time.
load_dotenv()

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logging.getLogger("rendering").setLevel(logging.INFO)
logging.getLogger("jobs").setLevel(logging.INFO)
logging.getLogger("agents").setLevel(logging.INFO)

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse

from api.routes import router as api_router
from db import init_db


def _env_flag(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _csv_env(name: str, default: str = "") -> list[str]:
    value = os.getenv(name, default)
    return [item.strip() for item in value.split(",") if item.strip()]


ENVIRONMENT = os.getenv("ENVIRONMENT", "development").strip().lower()
API_KEY = os.getenv("VISUAL_LAB_API_KEY", "").strip()
ALLOW_UNAUTHENTICATED = _env_flag(
    "VISUAL_LAB_ALLOW_UNAUTHENTICATED",
    default=False,
)
RAW_RENDER_ENABLED = _env_flag("VISUAL_LAB_RAW_RENDER_ENABLED", default=False)
DOCS_ENABLED = _env_flag(
    "VISUAL_LAB_DOCS_ENABLED",
    default=ENVIRONMENT != "production",
)
MAX_REQUEST_BYTES = max(
    1_024,
    int(os.getenv("VISUAL_LAB_MAX_REQUEST_BYTES", "1048576")),
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Initialize the persistence layer without enabling production traffic."""
    logging.getLogger(__name__).info("Initializing Visual Lab database")
    await init_db()
    logging.getLogger(__name__).info("Visual Lab database ready")
    yield
    logging.getLogger(__name__).info("Visual Lab shutting down")


app = FastAPI(
    title="KampüsGO Visual Lab API",
    description=(
        "Controlled-pilot service for turning approved educational sources "
        "into narrated visual explanations."
    ),
    version="0.1.0-pilot",
    docs_url="/docs" if DOCS_ENABLED else None,
    redoc_url="/redoc" if DOCS_ENABLED else None,
    openapi_url="/openapi.json" if DOCS_ENABLED else None,
    lifespan=lifespan,
)

allowed_origins = _csv_env(
    "CORS_ALLOWED_ORIGINS",
    default="http://localhost:3000,http://127.0.0.1:3000",
)
origin_regex = os.getenv("CORS_ALLOWED_ORIGIN_REGEX", "").strip() or None

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=origin_regex,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=[
        "Accept",
        "Content-Type",
        "X-Visual-Lab-Key",
    ],
)


@app.middleware("http")
async def pilot_security_boundary(request: Request, call_next):
    """Fail closed around expensive API operations.

    ``/api/health`` remains public for container health checks. Every other API
    endpoint requires a server-held key unless explicitly relaxed for local
    development. The raw-code render route is disabled independently and by
    default, even when the general API key is valid.
    """

    path = request.url.path

    if path == "/api/render" and not RAW_RENDER_ENABLED:
        return JSONResponse(status_code=404, content={"detail": "Not found"})

    if request.method in {"POST", "PUT", "PATCH"}:
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                if int(content_length) > MAX_REQUEST_BYTES:
                    return JSONResponse(
                        status_code=413,
                        content={"detail": "Request body is too large."},
                    )
            except ValueError:
                return JSONResponse(
                    status_code=400,
                    content={"detail": "Invalid Content-Length header."},
                )

    is_protected_api = path.startswith("/api/") and path != "/api/health"
    local_bypass = ALLOW_UNAUTHENTICATED and ENVIRONMENT != "production"

    if is_protected_api and not local_bypass:
        if not API_KEY:
            logging.getLogger(__name__).error(
                "VISUAL_LAB_API_KEY is missing; protected API is unavailable"
            )
            return JSONResponse(
                status_code=503,
                content={"detail": "Visual Lab API authentication is not configured."},
            )

        supplied_key = request.headers.get("x-visual-lab-key", "")
        if not supplied_key or not hmac.compare_digest(supplied_key, API_KEY):
            return JSONResponse(
                status_code=401,
                content={"detail": "Unauthorized"},
                headers={"WWW-Authenticate": "VisualLabKey"},
            )

    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    return response


app.include_router(api_router)


@app.get("/api/pilot", tags=["pilot"])
async def pilot_metadata():
    """Return non-secret deployment boundaries for operator verification."""
    return {
        "service": "kampusgo-visual-lab",
        "mode": "controlled_pilot",
        "environment": ENVIRONMENT,
        "rawRenderEnabled": RAW_RENDER_ENABLED,
        "authenticationRequired": not (
            ALLOW_UNAUTHENTICATED and ENVIRONMENT != "production"
        ),
        "productionAllowed": False,
    }


@app.get("/", include_in_schema=False)
async def root():
    if DOCS_ENABLED:
        return RedirectResponse(url="/docs")
    return JSONResponse(
        content={
            "service": "kampusgo-visual-lab",
            "status": "available",
            "mode": "controlled_pilot",
            "productionAllowed": False,
        }
    )


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("PORT") or os.getenv("API_PORT", "8000"))
    uvicorn.run("main:app", host=host, port=port, reload=ENVIRONMENT == "development")
