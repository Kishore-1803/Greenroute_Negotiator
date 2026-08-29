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
        
        post_change = RouteMetrics(
            mode=baseline.mode,
            distance_km=baseline.distance_km,
            duration_min=surged_duration,
            geometry=baseline.geometry,
            node_sequence=None,
            source=baseline.source
        )
        
        t1 = time.perf_counter()
        
        timings = {
            "api_call_seconds": round(t1 - t0, 3),
            "surge_multiplier": surge_multiplier,
            "simulated": True
        }
        
        return post_change, timings
