"""
domain/routing/interfaces.py

Ports the domain/application layers depend on. Concrete adapters (OSRM today, something else
tomorrow) live in infrastructure/routing/ and implement these Protocols -- nothing in here
imports httpx, OSRM, Docker, or any other infrastructure concern.
"""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from app.domain.routing.entities import RouteMetrics


@runtime_checkable
class RoutingProvider(Protocol):
    """route(origin, destination, profile) -- Blueprint Section 1's OSRM role, abstracted."""

    async def route(
        self, mode: str, origin: tuple[float, float], destination: tuple[float, float], with_nodes: bool = False
    ) -> RouteMetrics:
        """Raises RouteNotFoundError / RoutingUnavailableError (domain/common/errors.py) --
        never returns a fabricated RouteMetrics."""
        ...

    async def route_all_modes(
        self, origin: tuple[float, float], destination: tuple[float, float]
    ) -> dict[str, RouteMetrics]:
        """Per-mode failures are represented as a RouteMetrics with distance/duration=None,
        not raised -- one broken mode must not take down the others."""
        ...


class ConditionChangeSimulator(Protocol):
    """apply_condition_change(...) -- Blueprint Section 2's traffic-simulation role,
    abstracted. Today this means OSRM's segment-speed-file + osrm-customize mechanism; the
    interface says nothing about how the change is actually realized."""

    async def apply_condition_change(
        self, mode: str, origin: tuple[float, float], destination: tuple[float, float]
    ) -> tuple[RouteMetrics, dict]:
        """Returns (post_change_metrics, timings). Raises RoutingUnavailableError on failure --
        callers must not silently substitute a fabricated post-change route."""
        ...
