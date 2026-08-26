"""TEYS controlled-pilot API over the pinned arXivisual runtime."""

from __future__ import annotations

import hmac
import logging
import os
import subprocess
from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from medical_simulation import router as medical_router
from rendering.local_runner import get_manim_executable


def _flag(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _csv(name: str, default: str = "") -> list[str]:
    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]


ENVIRONMENT = os.getenv("ENVIRONMENT", "development").strip().lower()
API_KEY = os.getenv("MEDICAL_SIMULATION_API_KEY", "").strip()
ALLOW_UNAUTHENTICATED = _flag("MEDICAL_SIMULATION_ALLOW_UNAUTHENTICATED", False)
DOCS_ENABLED = _flag("MEDICAL_SIMULATION_DOCS_ENABLED", ENVIRONMENT != "production")
MAX_REQUEST_BYTES = max(1_024, int(os.getenv("MEDICAL_SIMULATION_MAX_REQUEST_BYTES", "1048576")))


@asynccontextmanager
async def lifespan(_: FastAPI):
    logging.getLogger(__name__).info("TEYS medical scene service started")
    yield
    logging.getLogger(__name__).info("TEYS medical scene service stopped")


app = FastAPI(
    title="TEYS arXivisual Medical Simulation API",
    description="Expert-approved synthetic clinical transitions rendered through arXivisual and Manim.",
    version="0.2.0-pilot",
    docs_url="/docs" if DOCS_ENABLED else None,
    redoc_url="/redoc" if DOCS_ENABLED else None,
    openapi_url="/openapi.json" if DOCS_ENABLED else None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_csv(
        "CORS_ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ),
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Accept", "Content-Type", "X-Medical-Simulation-Key", "X-Expert-Approval-Confirmed"],
)


@app.middleware("http")
async def controlled_pilot_boundary(request: Request, call_next):
    path = request.url.path

    if request.method in {"POST", "PUT", "PATCH"}:
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                if int(content_length) > MAX_REQUEST_BYTES:
                    return JSONResponse(status_code=413, content={"detail": "Request body is too large."})
            except ValueError:
                return JSONResponse(status_code=400, content={"detail": "Invalid Content-Length header."})
        body = await request.body()
        if len(body) > MAX_REQUEST_BYTES:
            return JSONResponse(status_code=413, content={"detail": "Request body is too large."})

    public_paths = {"/", "/api/medical/health"}
    protected = path.startswith("/api/medical/") and path not in public_paths
    local_bypass = ALLOW_UNAUTHENTICATED and ENVIRONMENT != "production"
    if protected and not local_bypass:
        if len(API_KEY) < 32:
            return JSONResponse(
                status_code=503,
                content={"detail": "Medical simulation API authentication is not configured."},
            )
        supplied = request.headers.get("x-medical-simulation-key", "")
        if not supplied or not hmac.compare_digest(supplied, API_KEY):
            return JSONResponse(
                status_code=401,
                content={"detail": "Unauthorized"},
                headers={"WWW-Authenticate": "MedicalSimulationKey"},
            )

    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    return response


app.include_router(medical_router)


@app.get("/api/medical/health")
async def health():
    manim = "unavailable"
    try:
        result = subprocess.run(
            [get_manim_executable(), "--version"],
            capture_output=True,
            text=True,
            timeout=8,
            stdin=subprocess.DEVNULL,
        )
        if result.returncode == 0:
            manim = (result.stdout or result.stderr).strip().splitlines()[0][:160]
    except Exception:
        pass

    provider = (
        "azure"
        if os.getenv("AZURE_OPENAI_API_KEY") and os.getenv("AZURE_OPENAI_ENDPOINT")
        else "dedalus"
        if os.getenv("DEDALUS_API_KEY")
        else "not_configured"
    )
    healthy = manim != "unavailable" and provider != "not_configured"
    return JSONResponse(
        status_code=200 if healthy else 503,
        content={
            "status": "healthy" if healthy else "degraded",
            "service": "teys-arxivisual-medical-simulation",
            "mode": "controlled_pilot",
            "provider": provider,
            "manim": manim,
            "rawRenderEnabled": False,
            "expertApprovalRequired": True,
            "productionAllowed": False,
        },
    )


@app.get("/api/medical/pilot")
async def pilot_metadata():
    return {
        "service": "teys-arxivisual-medical-simulation",
        "mode": "controlled_pilot",
        "authenticationRequired": not (ALLOW_UNAUTHENTICATED and ENVIRONMENT != "production"),
        "expertApprovalRequired": True,
        "rawRenderEnabled": False,
        "productionAllowed": False,
    }


@app.get("/")
async def root():
    return {
        "service": "teys-arxivisual-medical-simulation",
        "status": "available",
        "productionAllowed": False,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=os.getenv("API_HOST", "0.0.0.0"),
        port=int(os.getenv("PORT") or os.getenv("API_PORT", "8000")),
        reload=ENVIRONMENT == "development",
    )
