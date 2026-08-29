"""domain/routing/entities.py -- pure data, no framework imports."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class RouteMetrics:
    """Raw output of a routing query, before any cost/carbon enrichment. distance/duration
    are None when routing failed for this mode (never fabricated -- see RouteNotFoundError)."""
    mode: str
    distance_km: float | None
    duration_min: float | None
    node_sequence: tuple[int, ...] | None = None  # only populated when annotations were requested
    geometry: dict | None = None  # raw OSRM GeoJSON LineString geometry, for map rendering only
    # Master Plan Section 6's OSRM-showstopper mitigation ("cache 3 realistic demo routes"):
    # "live" means these numbers came from a real osrm-routed response this request; "cache"
    # means OSRM was unreachable and a pre-recorded route for this exact origin/destination
    # was served instead -- always disclosed via ModeMetrics.routing_source downstream, never
    # silently presented as live.
    source: str = "live"  # "live" | "cache"
    stops: list[tuple[float, float]] | None = None
    traffic_segments: list[dict] | None = None
