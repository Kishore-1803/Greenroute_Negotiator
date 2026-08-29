"""
app/main.py

Composition entrypoint. Creates the FastAPI app, wires the error handlers, mounts the
versioned public API (/api/v1) plus the internal debug router (development-only, 404s
elsewhere -- see api/routers/internal_debug.py). No business logic here -- if you're tempted
to add a calculation or an OSRM call in this file, it belongs in application/ or
infrastructure/ instead.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.error_handlers import register_error_handlers
from app.api.routers import health, internal_debug, trips
from app.infrastructure.config.settings import get_settings
from app.infrastructure.observability.logging import configure_logging

settings = get_settings()
configure_logging(settings.log_level)

app = FastAPI(
    title="GreenRoute Negotiator",
    version="0.3.0",
    description=(
        "Deterministic mode-switch recommendation API. /api/v1/* is the versioned public "
        "contract; /internal/* is local-development-only and excluded from the OpenAPI schema."
    ),
)

# Explicit, environment-configured origins. LAN deployments normally use the same-origin Vite
# proxy and need no CORS entry; this only supports intentionally direct browser-to-API setups.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

register_error_handlers(app)

app.include_router(health.router)
app.include_router(trips.router)
from app.api.routers import users
app.include_router(users.router)
app.include_router(internal_debug.router)
