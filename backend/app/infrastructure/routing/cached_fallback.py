"""
infrastructure/routing/cached_fallback.py

CachedFallbackRoutingProvider -- Provides a cached route fallback if the primary
routing provider (e.g. Google Maps) fails or is unreachable.
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
                logger.warning("Routing Provider unreachable for mode=%s on the demo trip -- serving cached fallback route", mode)
                return cached
            raise

    async def route_all_modes(
        self, origin: tuple[float, float], destination: tuple[float, float]
    ) -> dict[str, RouteMetrics]:
        is_demo_trip = _matches_demo_trip(self._settings, origin, destination)
        results: dict[str, RouteMetrics] = {}
        for mode in ["car", "two_wheeler", "cycling"]:
            try:
                results[mode] = await self._inner.route(mode, origin, destination)
            except RoutingUnavailableError:
                cached = CACHED_DEMO_ROUTES.get(mode) if is_demo_trip else None
                if cached is not None:
                    logger.warning("Routing Provider unreachable for mode=%s on the demo trip -- serving cached fallback route", mode)
                    results[mode] = cached
                else:
                    results[mode] = RouteMetrics(mode=mode, distance_km=None, duration_min=None, source="live")
            except Exception:
                results[mode] = RouteMetrics(mode=mode, distance_km=None, duration_min=None, source="live")
        return results
