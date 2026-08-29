"""
app/api/routers/internal_debug.py

Phase 1's raw OSRM debug endpoints, carried forward for local development only --
`include_in_schema=False` keeps them out of the public OpenAPI contract (Part D: \"Do NOT
expose internal OSRM/debug endpoints as public API\"). Not versioned under /api/v1 on purpose,
so it's visually obvious these are not part of the frozen contract.

The surge endpoint (POST /internal/routing-test/surge) has an additional shared-secret
header check (X-Debug-Token) on top of the environment gate, because it triggers a real
Docker osrm-customize + container restart and is therefore destructive. The read-only GET
endpoint does not require this extra check -- it only reads data. Generate the token once
and add it to .env as INTERNAL_DEBUG_TOKEN. If unset, the surge endpoint will always reject
(fail-closed, not fail-open).
"""

from __future__ import annotations

import os

from fastapi import APIRouter, Depends, Header, HTTPException

from app.api.dependencies import get_routing_provider, get_traffic_simulator
from app.infrastructure.config.settings import Settings, get_settings
from app.infrastructure.routing.osrm.cached_fallback import CachedFallbackRoutingProvider
from app.infrastructure.routing.osrm.traffic import OSRMTrafficSimulator

router = APIRouter(prefix="/internal", tags=["internal-debug"], include_in_schema=False)


def _require_development(settings: Settings = Depends(get_settings)) -> Settings:
    # These routes are not just hidden from the OpenAPI schema -- include_in_schema=False is
    # not access control, anyone who knows/guesses the path could otherwise call them, including
    # the surge route below which triggers a real Docker osrm-customize + container restart.
    # Gate on environment so they 404 outside local development, same as if they didn't exist.
    if settings.environment != "development":
        raise HTTPException(status_code=404, detail="Not Found")
    return settings


def _require_surge_token(x_debug_token: str | None = Header(default=None)) -> None:
    """Extra guard for the destructive surge endpoint only. Fails with 404 (not 401/403) to
    avoid revealing the endpoint's existence to someone who guesses the path but not the token.
    Fail-closed: if INTERNAL_DEBUG_TOKEN is not set in the environment, the endpoint always
    rejects, preventing accidental activation without any configuration."""
    expected = os.getenv("INTERNAL_DEBUG_TOKEN")
    if not expected or x_debug_token != expected:
        raise HTTPException(status_code=404, detail="Not Found")


@router.get("/routing-test")
async def routing_test(
    routing: CachedFallbackRoutingProvider = Depends(get_routing_provider),
    settings: Settings = Depends(_require_development),
):
    routes = await routing.route_all_modes(settings.default_origin, settings.default_destination)
    return {
        mode: {"distance_km": r.distance_km, "duration_min": r.duration_min, "status": "ok" if r.distance_km else "error"}
        for mode, r in routes.items()
    }


@router.post("/routing-test/surge")
async def routing_test_surge(
    traffic_simulator: OSRMTrafficSimulator = Depends(get_traffic_simulator),
    settings: Settings = Depends(_require_development),
    _token: None = Depends(_require_surge_token),
):
    post_change, timings = await traffic_simulator.apply_condition_change(
        "car", settings.default_origin, settings.default_destination
    )
    return {"post_change": {"distance_km": post_change.distance_km, "duration_min": post_change.duration_min}, "timings": timings}
