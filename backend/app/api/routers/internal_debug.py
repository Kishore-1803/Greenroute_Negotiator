"""
app/api/routers/internal_debug.py

Phase 1's raw OSRM debug endpoints, carried forward for local development only --
`include_in_schema=False` keeps them out of the public OpenAPI contract (Part D: "Do NOT
expose internal OSRM/debug endpoints as public API"). Not versioned under /api/v1 on purpose,
so it's visually obvious these are not part of the frozen contract.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_routing_provider, get_traffic_simulator
from app.infrastructure.config.settings import Settings, get_settings
from app.infrastructure.routing.cached_fallback import CachedFallbackRoutingProvider
from app.infrastructure.routing.google_maps.traffic import GoogleMapsTrafficSimulator

router = APIRouter(prefix="/internal", tags=["internal-debug"], include_in_schema=False)


def _require_development(settings: Settings = Depends(get_settings)) -> Settings:
    # These routes are not just hidden from the OpenAPI schema -- include_in_schema=False is
    # not access control, anyone who knows/guesses the path could otherwise call them, including
    # the surge route below which triggers a real Docker osrm-customize + container restart.
    # Gate on environment so they 404 outside local development, same as if they didn't exist.
    if settings.environment != "development":
        raise HTTPException(status_code=404, detail="Not Found")
    return settings


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
    traffic_simulator: GoogleMapsTrafficSimulator = Depends(get_traffic_simulator),
    settings: Settings = Depends(_require_development),
):
    post_change, timings = await traffic_simulator.apply_condition_change(
        "car", settings.default_origin, settings.default_destination
    )
    return {"post_change": {"distance_km": post_change.distance_km, "duration_min": post_change.duration_min}, "timings": timings}
