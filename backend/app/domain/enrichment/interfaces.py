"""domain/enrichment/interfaces.py -- cost/carbon enrichment port."""

from __future__ import annotations

from typing import Protocol

from app.domain.decision.entities import ModeMetrics
from app.domain.routing.entities import RouteMetrics


class CostCarbonProvider(Protocol):
    """derive cost/carbon (Part D's Modularity Rule) -- ONE responsibility: turn a
    RouteMetrics into a ModeMetrics via distance_km * factor. No AQI/weather/LLM adjustment
    belongs behind this interface; that would be a different, not-yet-built concern."""

    def enrich(self, route: RouteMetrics) -> ModeMetrics:
        """Returns available=False (never a fabricated number) if route.distance_km is None
        or no factor is on file for route.mode."""
        ...
