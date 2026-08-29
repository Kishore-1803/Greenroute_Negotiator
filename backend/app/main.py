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
from app.api.routers import health, internal_debug, network, speech, trips, users
from app.infrastructure.config.settings import get_settings
from app.infrastructure.observability.logging import configure_logging

settings = get_settings()
configure_logging(settings.log_level)

app = FastAPI(
    title="GreenRoute 2.0 Dynamic Journey Cooperation Network",
    version="2.0.0",
    description=(
        "GreenRoute 2.0 Backend: Multi-traveler journey graph G(V,E) cooperation and "
        "OSRM Tamil Nadu / Chennai spatial-temporal overlap negotiation engine."
    ),
)

# Explicit, environment-configured origins. LAN deployments normally use the same-origin Vite
# proxy and need no CORS entry; this only supports intentionally direct browser-to-API setups.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
    # /speech/narrate returns audio with these; a direct browser-to-API (non-proxy) setup
    # needs them explicitly exposed to read the provider/voice off the response.
    expose_headers=["X-Speech-Provider", "X-Speech-Voice", "X-Speech-Characters"],
)

register_error_handlers(app)

app.include_router(health.router)
app.include_router(trips.router)
app.include_router(network.router)
app.include_router(speech.router)
app.include_router(users.router)
app.include_router(internal_debug.router)
