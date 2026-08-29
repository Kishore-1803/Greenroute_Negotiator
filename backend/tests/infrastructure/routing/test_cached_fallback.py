"""Test suite for infrastructure.routing.osrm.cached_fallback (Master Plan Section 6)."""

from __future__ import annotations

import pytest

from app.domain.common.errors import RoutingUnavailableError
from app.infrastructure.config.settings import get_settings
from app.infrastructure.routing.osrm.cached_fallback import _CACHED_ROUTE_1, CachedFallbackRoutingProvider


class _AlwaysDownRoutingProvider:
    async def route(self, mode, origin, destination, with_nodes=False):
        raise RoutingUnavailableError("simulated: connection refused")

    async def route_all_modes(self, origin, destination):
        raise NotImplementedError


@pytest.fixture
def settings():
    return get_settings()


@pytest.fixture
def wrapped(settings):
    return CachedFallbackRoutingProvider(_AlwaysDownRoutingProvider(), settings)


async def test_osrm_down_on_the_known_demo_trip_serves_cached_routes(wrapped, settings):
    results = await wrapped.route_all_modes(settings.default_origin, settings.default_destination)
    for mode, cached in _CACHED_ROUTE_1.items():
        assert results[mode].distance_km == cached.distance_km
        assert results[mode].duration_min == cached.duration_min
        assert results[mode].source == "cache"


async def test_osrm_down_on_an_unrelated_trip_fails_honestly_not_fabricated(wrapped):
    results = await wrapped.route_all_modes((0.0, 0.0), (1.0, 1.0))
    assert all(r.distance_km is None and r.duration_min is None for r in results.values())


async def test_single_mode_route_also_falls_back_on_the_demo_trip(wrapped, settings):
    result = await wrapped.route("car", settings.default_origin, settings.default_destination)
    assert result.source == "cache"
    assert result.distance_km == _CACHED_ROUTE_1["car"].distance_km


async def test_single_mode_route_reraises_for_an_unrelated_trip(wrapped):
    with pytest.raises(RoutingUnavailableError):
        await wrapped.route("car", (0.0, 0.0), (1.0, 1.0))


def test_cached_fallback_implements_routing_provider_protocol(wrapped):
    """Locks down that CachedFallbackRoutingProvider structurally satisfies the RoutingProvider
    Protocol. RoutingProvider is @runtime_checkable so isinstance() works here. A future
    refactor that silently drops or renames a Protocol method will fail this test immediately."""
    from app.domain.routing.interfaces import RoutingProvider
    assert isinstance(wrapped, RoutingProvider), (
        "CachedFallbackRoutingProvider must implement the RoutingProvider protocol"
    )
