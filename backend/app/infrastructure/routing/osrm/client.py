"""
infrastructure/routing/osrm/client.py

OSRMRoutingProvider -- the concrete adapter implementing domain.routing.interfaces.RoutingProvider.
ONE responsibility: talk to the 3 osrm-routed containers over HTTP and translate their
responses into domain.routing.entities.RouteMetrics or a domain error. Everything OSRM- and
httpx-specific stays in this file; nothing above the domain interface knows OSRM exists.

Moved from Phase 1/2's services/osrm_service.py -- same behavior, now behind the port.
"""

from __future__ import annotations

import logging

import httpx

from app.domain.common.errors import RouteNotFoundError, RoutingUnavailableError
from app.domain.routing.entities import RouteMetrics
from app.infrastructure.config.settings import Settings

logger = logging.getLogger(__name__)


class OSRMRoutingProvider:
    def __init__(self, settings: Settings):
        self._settings = settings

    def _base_url(self, mode: str) -> str:
        endpoint = self._settings.osrm_endpoints.get(mode)
        if endpoint is None:
            raise RouteNotFoundError(f"unknown mode {mode!r}; expected one of {sorted(self._settings.osrm_endpoints)}")
        return f"{self._settings.osrm_host}:{endpoint.port}"

    async def route(
        self, mode: str, origin: tuple[float, float], destination: tuple[float, float], with_nodes: bool = False
    ) -> RouteMetrics:
        endpoint = self._settings.osrm_endpoints.get(mode)
        if endpoint is None:
            raise RouteNotFoundError(f"unknown mode {mode!r}; expected one of {sorted(self._settings.osrm_endpoints)}")

        o_lon, o_lat = origin
        d_lon, d_lat = destination
        url = f"{self._base_url(mode)}/route/v1/{endpoint.profile_segment}/{o_lon},{o_lat};{d_lon},{d_lat}"
        # overview=full + geometries=geojson: fetch real route geometry for map rendering
        # (Phase 5, additive-only -- distance/duration parsing below is unchanged).
        params = {"overview": "full", "geometries": "geojson"}
        if with_nodes:
            params["annotations"] = "nodes"

        try:
            async with httpx.AsyncClient(timeout=self._settings.osrm_request_timeout_s) as client:
                response = await client.get(url, params=params)
        except httpx.RequestError as exc:
            raise RoutingUnavailableError(f"could not reach OSRM for mode={mode!r} at {url}: {exc}") from exc

        try:
            body = response.json()
        except ValueError as exc:
            raise RoutingUnavailableError(f"OSRM for mode={mode!r} returned a non-JSON body: {response.text[:200]!r}") from exc

        code = body.get("code")
        if code != "Ok" or not body.get("routes"):
            raise RouteNotFoundError(f"OSRM for mode={mode!r} returned code={code!r}: {body.get('message', '')}")

        route = body["routes"][0]
        node_sequence = None
        if with_nodes:
            try:
                node_sequence = tuple(route["legs"][0]["annotation"]["nodes"])
            except (KeyError, IndexError):
                node_sequence = None

        return RouteMetrics(
            mode=mode,
            distance_km=round(route["distance"] / 1000, 3),
            duration_min=round(route["duration"] / 60, 3),
            node_sequence=node_sequence,
            geometry=route.get("geometry"),
        )

    async def route_all_modes(
        self, origin: tuple[float, float], destination: tuple[float, float]
    ) -> dict[str, RouteMetrics]:
        results: dict[str, RouteMetrics] = {}
        for mode in self._settings.osrm_endpoints:
            try:
                results[mode] = await self.route(mode, origin, destination)
            except (RouteNotFoundError, RoutingUnavailableError) as exc:
                logger.warning("routing failed for mode=%s: %s", mode, exc)
                results[mode] = RouteMetrics(mode=mode, distance_km=None, duration_min=None)
        return results
