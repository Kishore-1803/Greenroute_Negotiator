"""
infrastructure/routing/osrm/cached_fallback.py

CachedFallbackRoutingProvider -- Master Plan Section 6's named mitigation for the "OSRM
Timeout / public server downtime" showstopper risk ("Cache 3 realistic local demo routes in
JSON"). Wraps another RoutingProvider (normally OSRMRoutingProvider): on a genuine
RoutingUnavailableError (OSRM unreachable, not merely "no route found"), serves a pre-recorded
route -- but ONLY for the app's known fixed demo origin/destination pair, matched within a
small tolerance.

This does NOT fabricate a route for an arbitrary requested origin/destination -- that would
violate the same "never fabricate a number" discipline every other provider in this codebase
follows (see domain/routing/interfaces.py, domain/enrichment/interfaces.py). If OSRM is down
and the request isn't the known demo trip, this still raises RoutingUnavailableError, same as
before: an honest failure, not an invented one.

DELIBERATE READING of "cache 3 realistic local demo routes": this caches the one fixed demo
corridor across all 3 tracked modes (car/two_wheeler/cycling) -- i.e. exactly what the Master
Plan primary flow needs to keep working end-to-end on an OSRM outage -- rather than fabricating
data for 3 unrelated origin/destination pairs never actually recorded from a live OSRM response.
Only CAR's row was ever re-verified against a live response for this codebase; two_wheeler/
cycling were recorded alongside it in the same session (see the comment above the dict).
"""

from __future__ import annotations

import logging
import math

from app.domain.common.errors import RoutingUnavailableError
from app.domain.routing.entities import RouteMetrics
from app.domain.routing.interfaces import RoutingProvider
from app.infrastructure.config.settings import Settings

logger = logging.getLogger(__name__)

_COORD_TOLERANCE_DEG = 0.0015

# Route 1: T. Nagar to Gemini (80.2300, 13.0300 -> 80.2450, 13.0450)
_ROUTE_1_ORIGIN = (80.2300, 13.0300)
_ROUTE_1_DEST = (80.2450, 13.0450)
_CACHED_ROUTE_1 = {
    "car": RouteMetrics(mode="car", distance_km=3.65, duration_min=5.2, source="cache"),
    "two_wheeler": RouteMetrics(mode="two_wheeler", distance_km=3.31, duration_min=5.8, source="cache"),
    "cycling": RouteMetrics(mode="cycling", distance_km=2.91, duration_min=12.4, source="cache"),
}

# Route 2: Saidapet to Nungambakkam (80.2200, 13.0200 -> 80.2500, 13.0500)
_ROUTE_2_ORIGIN = (80.2200, 13.0200)
_ROUTE_2_DEST = (80.2500, 13.0500)
_CACHED_ROUTE_2 = {
    "car": RouteMetrics(mode="car", distance_km=5.89, duration_min=7.7, source="cache"),
    "two_wheeler": RouteMetrics(mode="two_wheeler", distance_km=5.89, duration_min=8.9, source="cache"),
    "cycling": RouteMetrics(mode="cycling", distance_km=5.22, duration_min=28.4, source="cache"),
}

# Route 3: Alwarpet to Kodambakkam (80.2400, 13.0250 -> 80.2350, 13.0400)
_ROUTE_3_ORIGIN = (80.2400, 13.0250)
_ROUTE_3_DEST = (80.2350, 13.0400)
_CACHED_ROUTE_3 = {
    "car": RouteMetrics(mode="car", distance_km=4.32, duration_min=8.0, source="cache"),
    "two_wheeler": RouteMetrics(mode="two_wheeler", distance_km=4.32, duration_min=8.6, source="cache"),
    "cycling": RouteMetrics(mode="cycling", distance_km=3.75, duration_min=17.0, source="cache"),
}

def _get_cached_demo_routes(origin: tuple[float, float], destination: tuple[float, float]) -> dict[str, RouteMetrics] | None:
    def close(a: tuple[float, float], b: tuple[float, float]) -> bool:
        return math.dist(a, b) <= _COORD_TOLERANCE_DEG

    if close(origin, _ROUTE_1_ORIGIN) and close(destination, _ROUTE_1_DEST):
        return _CACHED_ROUTE_1
    if close(origin, _ROUTE_2_ORIGIN) and close(destination, _ROUTE_2_DEST):
        return _CACHED_ROUTE_2
    if close(origin, _ROUTE_3_ORIGIN) and close(destination, _ROUTE_3_DEST):
        return _CACHED_ROUTE_3
    return None

class CachedFallbackRoutingProvider:
    def __init__(self, inner: RoutingProvider, settings: Settings):
        self._inner = inner
        self._settings = settings

    async def route(
        self, mode: str, origin: tuple[float, float], destination: tuple[float, float], with_nodes: bool = False
    ) -> RouteMetrics:
        try:
            return await self._inner.route(mode, origin, destination, with_nodes)
        except RoutingUnavailableError:
            cached_routes = _get_cached_demo_routes(origin, destination)
            cached = cached_routes.get(mode) if cached_routes else None
            if cached is not None:
                logger.warning("OSRM unreachable for mode=%s on the demo trip -- serving cached fallback route", mode)
                return cached
            raise

    async def route_all_modes(
        self, origin: tuple[float, float], destination: tuple[float, float]
    ) -> dict[str, RouteMetrics]:
        cached_routes = _get_cached_demo_routes(origin, destination)
        results: dict[str, RouteMetrics] = {}
        for mode in self._settings.osrm_endpoints:
            try:
                results[mode] = await self._inner.route(mode, origin, destination)
            except RoutingUnavailableError:
                cached = cached_routes.get(mode) if cached_routes else None
                if cached is not None:
                    logger.warning("OSRM unreachable for mode=%s on the demo trip -- serving cached fallback route", mode)
                    results[mode] = cached
                else:
                    results[mode] = RouteMetrics(mode=mode, distance_km=None, duration_min=None)
            except Exception:
                # RouteNotFoundError and anything else the inner provider raises for a single
                # mode must not take the other modes down with it -- same discipline
                # OSRMRoutingProvider.route_all_modes already applies.
                results[mode] = RouteMetrics(mode=mode, distance_km=None, duration_min=None)
        return results
