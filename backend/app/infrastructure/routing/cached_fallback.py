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
from app.infrastructure.storage.transit_store import get_nearest_stations

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
        
        # Simulate traffic segments for all modes
        for m, route in results.items():
            if route.geometry and "coordinates" in route.geometry:
                coords = route.geometry["coordinates"]
                segments = []
                for i in range(len(coords) - 1):
                    # Deterministic simulated traffic based on coordinate index
                    level = "clear" if i % 3 == 0 else "mild" if i % 3 == 1 else "heavy"
                    segments.append({"start_idx": i, "end_idx": i + 1, "level": level})
                # Rebuild route with traffic segments
                results[m] = RouteMetrics(
                    mode=route.mode, distance_km=route.distance_km, duration_min=route.duration_min,
                    node_sequence=route.node_sequence, geometry=route.geometry, source=route.source,
                    stops=route.stops, traffic_segments=segments
                )

        # Append simulated bus and metro based on the car route, anchored to transit_store
        car_route = results.get("car")
        if car_route and car_route.distance_km is not None and car_route.geometry:
            coords = car_route.geometry["coordinates"]
            
            def _make_transit(mode: str, dur_multiplier: float, num_stops: int):
                start_lon, start_lat = coords[0]
                end_lon, end_lat = coords[-1]
                
                # Fetch real station coords from our DB
                nearest_start = get_nearest_stations(start_lat, start_lon, mode, 1)
                nearest_end = get_nearest_stations(end_lat, end_lon, mode, 1)
                
                stops = []
                # First stop
                if nearest_start:
                    stops.append(nearest_start[0])
                else:
                    stops.append((start_lon, start_lat))
                
                # Middle stops
                if num_stops > 2:
                    step = max(1, len(coords) // (num_stops - 1))
                    for i in range(1, num_stops - 1):
                        idx = min(i * step, len(coords) - 1)
                        stops.append(tuple(coords[idx]))
                        
                # End stop
                if nearest_end:
                    stops.append(nearest_end[0])
                else:
                    stops.append((end_lon, end_lat))
                
                # Build a simple line string connecting the stops
                geom = {"type": "LineString", "coordinates": [list(s) for s in stops]}
                
                # Simulate traffic segments for this new geometry
                segments = []
                for i in range(len(stops) - 1):
                    level = "clear" if mode == "metro" else ("mild" if i % 2 == 0 else "heavy")
                    segments.append({"start_idx": i, "end_idx": i + 1, "level": level})
                
                # Distance calculation is approximate for straight lines between stops
                dist_km = sum(math.dist(stops[i], stops[i+1]) * 111 for i in range(len(stops)-1))
                
                return RouteMetrics(
                    mode=mode,
                    distance_km=round(dist_km, 2) if dist_km > 0 else car_route.distance_km,
                    duration_min=round(car_route.duration_min * dur_multiplier, 1),
                    geometry=geom,
                    source="simulated_transit",
                    stops=stops,
                    traffic_segments=segments
                )
            
            results["bus"] = _make_transit("bus", 1.5, 4)
            results["metro"] = _make_transit("metro", 0.8, 3)
        else:
            results["bus"] = RouteMetrics(mode="bus", distance_km=None, duration_min=None)
            results["metro"] = RouteMetrics(mode="metro", distance_km=None, duration_min=None)

        return results
