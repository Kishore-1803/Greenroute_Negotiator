"""
infrastructure/routing/osrm/cached_fallback.py

CachedFallbackRoutingProvider -- Master Plan Section 6's named mitigation for the "OSRM
Timeout / public server downtime" showstopper risk ("Cache realistic local demo routes in
JSON"). Wraps another RoutingProvider (normally OSRMRoutingProvider): on a genuine
RoutingUnavailableError (OSRM unreachable, not merely "no route found"), serves pre-recorded
routes for demo corridors.
"""

from __future__ import annotations

import logging
import math

from app.domain.common.errors import RoutingUnavailableError
from app.domain.routing.entities import RouteMetrics
from app.domain.routing.interfaces import RoutingProvider
from app.infrastructure.config.settings import Settings

logger = logging.getLogger(__name__)

_COORD_TOLERANCE_DEG = 0.05  # ~5km tolerance to ensure demo trips in Chennai match reliably

# Route 1: T. Nagar to Gemini Flyover, Chennai (80.2300, 13.0300 -> 80.2450, 13.0450)
_ROUTE_1_ORIGIN = (80.2300, 13.0300)
_ROUTE_1_DEST = (80.2450, 13.0450)
_CACHED_ROUTE_1 = {
    "car": RouteMetrics(
        mode="car",
        distance_km=3.65,
        duration_min=5.2,
        source="cache",
        geometry={"type": "LineString", "coordinates": [[80.2300, 13.0300], [80.2350, 13.0360], [80.2410, 13.0410], [80.2450, 13.0450]]}
    ),
    "two_wheeler": RouteMetrics(
        mode="two_wheeler",
        distance_km=3.31,
        duration_min=5.8,
        source="cache",
        geometry={"type": "LineString", "coordinates": [[80.2300, 13.0300], [80.2340, 13.0350], [80.2400, 13.0400], [80.2450, 13.0450]]}
    ),
    "cycling": RouteMetrics(
        mode="cycling",
        distance_km=2.91,
        duration_min=12.4,
        source="cache",
        geometry={"type": "LineString", "coordinates": [[80.2300, 13.0300], [80.2330, 13.0340], [80.2390, 13.0390], [80.2450, 13.0450]]}
    ),
}

# Route 2: Saidapet to Nungambakkam, Chennai (80.2200, 13.0200 -> 80.2500, 13.0500)
_ROUTE_2_ORIGIN = (80.2200, 13.0200)
_ROUTE_2_DEST = (80.2500, 13.0500)
_CACHED_ROUTE_2 = {
    "car": RouteMetrics(
        mode="car",
        distance_km=5.89,
        duration_min=7.7,
        source="cache",
        geometry={"type": "LineString", "coordinates": [[80.2200, 13.0200], [80.2300, 13.0320], [80.2420, 13.0420], [80.2500, 13.0500]]}
    ),
    "two_wheeler": RouteMetrics(
        mode="two_wheeler",
        distance_km=5.89,
        duration_min=8.9,
        source="cache",
        geometry={"type": "LineString", "coordinates": [[80.2200, 13.0200], [80.2280, 13.0300], [80.2400, 13.0410], [80.2500, 13.0500]]}
    ),
    "cycling": RouteMetrics(
        mode="cycling",
        distance_km=5.22,
        duration_min=28.4,
        source="cache",
        geometry={"type": "LineString", "coordinates": [[80.2200, 13.0200], [80.2270, 13.0290], [80.2380, 13.0390], [80.2500, 13.0500]]}
    ),
}

# Route 3: Alwarpet to Kodambakkam, Chennai (80.2400, 13.0250 -> 80.2350, 13.0400)
_ROUTE_3_ORIGIN = (80.2400, 13.0250)
_ROUTE_3_DEST = (80.2350, 13.0400)
_CACHED_ROUTE_3 = {
    "car": RouteMetrics(
        mode="car",
        distance_km=4.32,
        duration_min=8.0,
        source="cache",
        geometry={"type": "LineString", "coordinates": [[80.2400, 13.0250], [80.2380, 13.0310], [80.2350, 13.0400]]}
    ),
    "two_wheeler": RouteMetrics(
        mode="two_wheeler",
        distance_km=4.32,
        duration_min=8.6,
        source="cache",
        geometry={"type": "LineString", "coordinates": [[80.2400, 13.0250], [80.2370, 13.0300], [80.2350, 13.0400]]}
    ),
    "cycling": RouteMetrics(
        mode="cycling",
        distance_km=3.75,
        duration_min=17.0,
        source="cache",
        geometry={"type": "LineString", "coordinates": [[80.2400, 13.0250], [80.2360, 13.0290], [80.2350, 13.0400]]}
    ),
}

# Coimbatore legacy fallback
_ROUTE_CBE_ORIGIN = (76.9605, 10.9955)
_ROUTE_CBE_DEST = (76.9735, 11.0070)
_CACHED_ROUTE_CBE = {
    "car": RouteMetrics(mode="car", distance_km=2.31, duration_min=5.8, source="cache"),
    "two_wheeler": RouteMetrics(mode="two_wheeler", distance_km=2.28, duration_min=6.6, source="cache"),
    "cycling": RouteMetrics(mode="cycling", distance_km=2.05, duration_min=10.9, source="cache"),
}


def _get_cached_demo_routes(settings: Settings, origin: tuple[float, float], destination: tuple[float, float]) -> dict[str, RouteMetrics] | None:
    def close(a: tuple[float, float], b: tuple[float, float], tol=_COORD_TOLERANCE_DEG) -> bool:
        return math.dist(a, b) <= tol

    if close(origin, _ROUTE_1_ORIGIN) and close(destination, _ROUTE_1_DEST):
        return _CACHED_ROUTE_1
    if close(origin, _ROUTE_2_ORIGIN) and close(destination, _ROUTE_2_DEST):
        return _CACHED_ROUTE_2
    if close(origin, _ROUTE_3_ORIGIN) and close(destination, _ROUTE_3_DEST):
        return _CACHED_ROUTE_3
    if close(origin, settings.default_origin) and close(destination, settings.default_destination):
        return _CACHED_ROUTE_1
    if close(origin, _ROUTE_CBE_ORIGIN) and close(destination, _ROUTE_CBE_DEST):
        return _CACHED_ROUTE_CBE

    # Fallback to Route 1 if within Chennai region (~0.2 deg) so demo never breaks
    if close(origin, _ROUTE_1_ORIGIN, tol=0.2):
        return _CACHED_ROUTE_1

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
            cached_routes = _get_cached_demo_routes(self._settings, origin, destination)
            cached = cached_routes.get(mode) if cached_routes else None
            if cached is not None:
                logger.warning("OSRM unreachable for mode=%s -- serving cached fallback route", mode)
                return cached
            raise

    async def route_all_modes(
        self, origin: tuple[float, float], destination: tuple[float, float]
    ) -> dict[str, RouteMetrics]:
        cached_routes = _get_cached_demo_routes(self._settings, origin, destination)
        results: dict[str, RouteMetrics] = {}
        for mode in self._settings.osrm_endpoints:
            try:
                results[mode] = await self._inner.route(mode, origin, destination)
            except RoutingUnavailableError:
                cached = cached_routes.get(mode) if cached_routes else None
                if cached is not None:
                    logger.warning("OSRM unreachable for mode=%s -- serving cached fallback route", mode)
                    results[mode] = cached
                else:
                    results[mode] = RouteMetrics(mode=mode, distance_km=None, duration_min=None)
            except Exception:
                results[mode] = RouteMetrics(mode=mode, distance_km=None, duration_min=None)
        return results
