"""
infrastructure/routing/google_maps/traffic.py

Google Maps implementation of domain.routing.interfaces.ConditionChangeSimulator.
Instead of rebuilding OSRM speed maps, this simulates a traffic surge by querying the baseline route 
and artificially injecting a delay penalty (multiplying duration).
"""

from __future__ import annotations

import logging
import time

from app.domain.common.errors import RoutingUnavailableError
from app.domain.routing.entities import RouteMetrics
from app.infrastructure.routing.google_maps.client import GoogleMapsRoutingProvider

logger = logging.getLogger(__name__)


class GoogleMapsTrafficSimulator:
    def __init__(self, routing_provider: GoogleMapsRoutingProvider):
        self._routing = routing_provider

    async def apply_condition_change(
        self, mode: str, origin: tuple[float, float], destination: tuple[float, float], surge_multiplier: float = 1.5
    ) -> tuple[RouteMetrics, dict]:
        
        t0 = time.perf_counter()
        
        # Only car gets surged typically, but we support the mode parameter.
        baseline = await self._routing.route(mode, origin, destination)
        
        if baseline.duration_min is None:
            raise RoutingUnavailableError(f"Could not get baseline route for {mode}")

        # Inject artificial penalty
        surged_duration = baseline.duration_min * surge_multiplier
        
        # Overwrite traffic segments to predominantly heavy for the surge
        surged_segments = None
        if baseline.traffic_segments:
            surged_segments = []
            for i, seg in enumerate(baseline.traffic_segments):
                level = "heavy" if i % 2 == 0 else "mild"
                surged_segments.append({"start_idx": seg["start_idx"], "end_idx": seg["end_idx"], "level": level})
        elif baseline.geometry and "coordinates" in baseline.geometry:
            coords = baseline.geometry["coordinates"]
            surged_segments = []
            for i in range(len(coords) - 1):
                level = "heavy" if i % 2 == 0 else "mild"
                surged_segments.append({"start_idx": i, "end_idx": i + 1, "level": level})

        post_change = RouteMetrics(
            mode=baseline.mode,
            distance_km=baseline.distance_km,
            duration_min=surged_duration,
            geometry=baseline.geometry,
            node_sequence=None,
            source=baseline.source,
            traffic_segments=surged_segments
        )
        
        t1 = time.perf_counter()
        
        timings = {
            "api_call_seconds": round(t1 - t0, 3),
            "surge_multiplier": surge_multiplier,
            "simulated": True
        }
        
        return post_change, timings
