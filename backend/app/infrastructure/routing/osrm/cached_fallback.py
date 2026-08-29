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

_COORD_TOLERANCE_DEG = 0.0015  # ~150m at this latitude -- loose enough to survive minor
# rounding/re-entry of "the same" demo coordinates, tight enough to never silently match an
# unrelated trip.

# Three realistic pre-recorded routes for the app's fixed demo corridor (Coimbatore --
# settings.default_origin/default_destination), one per tracked mode, recorded from a real
# OSRM response during development. Distances are consistent with the ~1.85km straight-line
# separation between the two points; durations reflect typical mixed local-road speeds per
# mode, not simple distance/speed arithmetic (matching how OSRM itself accounts for turns).
CACHED_DEMO_ROUTES: dict[str, RouteMetrics] = {
    "car": RouteMetrics(mode="car", distance_km=2.31, duration_min=5.8, source="cache"),
    "two_wheeler": RouteMetrics(mode="two_wheeler", distance_km=2.28, duration_min=6.6, source="cache"),
    "cycling": RouteMetrics(mode="cycling", distance_km=2.05, duration_min=10.9, source="cache"),
}


def _matches_demo_trip(settings: Settings, origin: tuple[float, float], destination: tuple[float, float]) -> bool:
    def close(a: tuple[float, float], b: tuple[float, float]) -> bool:
        return math.dist(a, b) <= _COORD_TOLERANCE_DEG

    return close(origin, settings.default_origin) and close(destination, settings.default_destination)


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
            cached = CACHED_DEMO_ROUTES.get(mode)
            if cached is not None and _matches_demo_trip(self._settings, origin, destination):
                logger.warning("OSRM unreachable for mode=%s on the demo trip -- serving cached fallback route", mode)
                return cached
            raise

    async def route_all_modes(
        self, origin: tuple[float, float], destination: tuple[float, float]
    ) -> dict[str, RouteMetrics]:
        is_demo_trip = _matches_demo_trip(self._settings, origin, destination)
        results: dict[str, RouteMetrics] = {}
        for mode in self._settings.osrm_endpoints:
            try:
                results[mode] = await self._inner.route(mode, origin, destination)
            except RoutingUnavailableError:
                cached = CACHED_DEMO_ROUTES.get(mode) if is_demo_trip else None
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
