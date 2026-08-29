"""
infrastructure/routing/google_maps/client.py

Google Maps Compute Routes API implementation of domain.routing.interfaces.RoutingProvider.
Replaces the old OSRM implementation. Uses the standard httpx async client.
"""

from __future__ import annotations

import logging
import httpx

from app.domain.common.errors import RouteNotFoundError, RoutingUnavailableError
from app.domain.routing.entities import RouteMetrics
from app.infrastructure.config.settings import Settings

logger = logging.getLogger(__name__)

_MODE_MAP = {
    "car": "DRIVE",
    "two_wheeler": "TWO_WHEELER",
    "cycling": "BICYCLE",
}


def decode_polyline(polyline_str: str) -> list[list[float]]:
    """Decodes a Google Maps encoded polyline into a list of [lon, lat] coordinates."""
    index = 0
    lat = 0
    lng = 0
    coordinates = []
    
    while index < len(polyline_str):
        b = 0
        shift = 0
        result = 0
        while True:
            b = ord(polyline_str[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        dlat = ~(result >> 1) if (result & 1) else (result >> 1)
        lat += dlat
        
        shift = 0
        result = 0
        while True:
            b = ord(polyline_str[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        dlng = ~(result >> 1) if (result & 1) else (result >> 1)
        lng += dlng
        
        coordinates.append([lng / 1e5, lat / 1e5])  # GeoJSON expects [lon, lat]
        
    return coordinates


class GoogleMapsRoutingProvider:
    def __init__(self, settings: Settings):
        self._api_key = settings.google_maps_api_key

    async def route(
        self, mode: str, origin: tuple[float, float], destination: tuple[float, float], with_nodes: bool = False
    ) -> RouteMetrics:
        if not self._api_key:
            raise RoutingUnavailableError("GOOGLE_MAPS_API_KEY is not set")
            
        gmaps_mode = _MODE_MAP.get(mode)
        if not gmaps_mode:
            raise RoutingUnavailableError(f"Unsupported mode for Google Maps: {mode}")

        url = "https://routes.googleapis.com/directions/v2:computeRoutes"
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": self._api_key,
            "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
        }
        
        payload = {
            "origin": {
                "location": {
                    "latLng": {
                        "latitude": origin[1],
                        "longitude": origin[0],
                    }
                }
            },
            "destination": {
                "location": {
                    "latLng": {
                        "latitude": destination[1],
                        "longitude": destination[0],
                    }
                }
            },
            "travelMode": gmaps_mode,
        }
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
        except httpx.RequestError as e:
            logger.error(f"Google Maps API request failed: {e}")
            raise RoutingUnavailableError(f"Google Maps API unreachable: {e}")
        except httpx.HTTPStatusError as e:
            logger.error(f"Google Maps API returned {e.response.status_code}: {e.response.text}")
            raise RoutingUnavailableError(f"Google Maps API error: {e.response.text}")

        routes = data.get("routes", [])
        if not routes:
            if mode == "cycling":
                logger.info(f"No cycling route found, falling back to TWO_WHEELER geometry for {origin} -> {destination}")
                try:
                    fallback = await self.route("two_wheeler", origin, destination, with_nodes)
                    if fallback.distance_km is not None:
                        return RouteMetrics(
                            mode=mode,
                            distance_km=fallback.distance_km,
                            duration_min=(fallback.distance_km / 15.0) * 60.0,
                            geometry=fallback.geometry,
                            node_sequence=None,
                            source="cycling-estimated",
                        )
                except Exception as e:
                    logger.warning(f"Cycling fallback to two_wheeler failed: {e}")
            raise RouteNotFoundError(f"No route found for {mode} between {origin} and {destination}")

        route_data = routes[0]
        
        duration_str = route_data.get("duration", "0s")
        duration_s = float(duration_str.rstrip("s"))
        duration_min = duration_s / 60.0
        
        distance_m = float(route_data.get("distanceMeters", 0))
        distance_km = distance_m / 1000.0
        
        polyline = route_data.get("polyline", {}).get("encodedPolyline")
        geometry = {"type": "LineString", "coordinates": decode_polyline(polyline)} if polyline else None

        return RouteMetrics(
            mode=mode,
            distance_km=distance_km,
            duration_min=duration_min,
            geometry=geometry,
            node_sequence=None,
            source="live",
        )

    async def route_all_modes(
        self, origin: tuple[float, float], destination: tuple[float, float]
    ) -> dict[str, RouteMetrics]:
        import asyncio
        
        async def fetch_mode(mode: str) -> tuple[str, RouteMetrics]:
            try:
                metrics = await self.route(mode, origin, destination)
                return mode, metrics
            except Exception as e:
                logger.warning(f"Failed to route {mode}: {e}")
                return mode, RouteMetrics(mode=mode, distance_km=None, duration_min=None, source="live")

        tasks = [fetch_mode(mode) for mode in _MODE_MAP.keys()]
        results_list = await asyncio.gather(*tasks)
        
        return dict(results_list)
