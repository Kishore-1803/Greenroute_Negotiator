"""
infrastructure/routing/google_maps/client.py

Google Maps Compute Routes API & Geocoding API implementation of domain.routing.interfaces.RoutingProvider.
Uses standard httpx async client.
"""

from __future__ import annotations

import logging

import httpx

from app.domain.common.errors import RouteNotFoundError, RoutingUnavailableError
from app.domain.routing.entities import RouteMetrics
from app.infrastructure.config.settings import Settings

logger = logging.getLogger(__name__)

# Standardized mode mapping for Google Routes API
_MODE_MAP = {
    "car": "DRIVE",
    "drive": "DRIVE",
    "driving": "DRIVE",
    "two_wheeler": "TWO_WHEELER",
    "two-wheeler": "TWO_WHEELER",
    "bike": "TWO_WHEELER",
    "motorcycle": "TWO_WHEELER",
    "2w": "TWO_WHEELER",
    "cycling": "BICYCLE",
    "cycle": "BICYCLE",
    "bicycle": "BICYCLE",
    "bicycling": "BICYCLE",
    "walk": "WALK",
    "walking": "WALK",
    "transit": "TRANSIT",
    "bus": "TRANSIT",
    "train": "TRANSIT",
}


def normalize_transport_mode(mode: str) -> str:
    """Standardizes user/frontend transport mode string into Google Routes API ENUM."""
    cleaned = str(mode).strip().lower()
    return _MODE_MAP.get(cleaned, "DRIVE")


def normalize_coordinates(point: tuple[float, float]) -> tuple[float, float]:
    """
    Ensures coordinates follow domain representation (lon, lat).
    Auto-detects and corrects inverted (lat, lon) inputs for India/global ranges.
    """
    x, y = float(point[0]), float(point[1])
    
    # Heuristic for India bounding box (Lat: ~6-38°N, Lon: ~68-98°E)
    # If x is in latitude range (6 to 38) and y is in longitude range (68 to 98), they were passed as (lat, lon)
    if 6.0 <= x <= 38.0 and 68.0 <= y <= 98.0:
        logger.info(f"Auto-correcting inverted (lat, lon) ({x}, {y}) -> (lon, lat) ({y}, {x})")
        return (y, x)
        
    return (x, y)


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

    async def geocode(self, query: str) -> tuple[float, float]:
        """
        Geocodes a raw text string (landmark, street name, or city) into (lon, lat)
        using the Google Geocoding API.
        """
        if not self._api_key:
            raise RoutingUnavailableError("GOOGLE_MAPS_API_KEY is not set for Geocoding")

        url = "https://maps.googleapis.com/maps/api/geocode/json"
        params = {"address": query.strip(), "key": self._api_key}

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
        except Exception as exc:
            logger.error(f"Google Geocoding request failed for '{query}': {exc}")
            raise RoutingUnavailableError(f"Geocoding failed: {exc}") from exc

        status = data.get("status")
        results = data.get("results", [])
        if status != "OK" or not results:
            logger.warning(f"Google Geocoding found no results for '{query}' (status={status})")
            raise RouteNotFoundError(f"Location not found for query '{query}'")

        loc = results[0]["geometry"]["location"]
        lat, lng = float(loc["lat"]), float(loc["lng"])
        return (lng, lat)  # Return standard (lon, lat)

    async def resolve_location(self, loc_input: str | tuple[float, float]) -> tuple[float, float]:
        """Resolves location input whether given as coordinates or raw text."""
        if isinstance(loc_input, (tuple, list)) and len(loc_input) == 2:
            return normalize_coordinates((float(loc_input[0]), float(loc_input[1])))
        if isinstance(loc_input, str):
            # Check if it's stringified coordinates e.g. "13.04, 80.23"
            parts = [p.strip() for p in loc_input.split(",") if p.strip()]
            if len(parts) == 2:
                try:
                    c1, c2 = float(parts[0]), float(parts[1])
                    return normalize_coordinates((c1, c2))
                except ValueError:
                    pass
            return await self.geocode(loc_input)
        raise RoutingUnavailableError(f"Invalid location input format: {loc_input}")

    async def route(
        self, mode: str, origin: tuple[float, float], destination: tuple[float, float], with_nodes: bool = False
    ) -> RouteMetrics:
        if not self._api_key:
            raise RoutingUnavailableError("GOOGLE_MAPS_API_KEY is not set")

        # Standardize coordinates & mode
        norm_origin = normalize_coordinates(origin)
        norm_dest = normalize_coordinates(destination)
        gmaps_mode = normalize_transport_mode(mode)

        url = "https://routes.googleapis.com/directions/v2:computeRoutes"
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": self._api_key,
            "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
        }

        # Google Routes API strictly expects {"latitude": lat, "longitude": lng}
        payload = {
            "origin": {
                "location": {
                    "latLng": {
                        "latitude": norm_origin[1],
                        "longitude": norm_origin[0],
                    }
                }
            },
            "destination": {
                "location": {
                    "latLng": {
                        "latitude": norm_dest[1],
                        "longitude": norm_dest[0],
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
            raise RoutingUnavailableError(f"Google Maps API unreachable: {e}") from e
        except httpx.HTTPStatusError as e:
            logger.error(f"Google Maps API returned {e.response.status_code}: {e.response.text}")
            raise RoutingUnavailableError(f"Google Maps API error: {e.response.text}") from e

        routes = data.get("routes", [])
        if not routes:
            # Fallback for modes like cycling in areas where direct bicycle routes are unmapped
            if gmaps_mode == "BICYCLE":
                logger.info(f"No direct cycling route found, estimating from TWO_WHEELER geometry for {norm_origin} -> {norm_dest}")
                try:
                    fallback = await self.route("two_wheeler", norm_origin, norm_dest, with_nodes)
                    if fallback.distance_km is not None:
                        return RouteMetrics(
                            mode=mode,
                            distance_km=fallback.distance_km,
                            duration_min=round((fallback.distance_km / 15.0) * 60.0, 2),
                            geometry=fallback.geometry,
                            node_sequence=None,
                            source="cycling-estimated",
                        )
                except Exception as e:
                    logger.warning(f"Cycling fallback to two_wheeler failed: {e}")
            raise RouteNotFoundError(f"No route found for {mode} between {norm_origin} and {norm_dest}")

        route_data = routes[0]

        duration_str = route_data.get("duration", "0s")
        duration_s = float(duration_str.rstrip("s"))
        duration_min = round(duration_s / 60.0, 2)

        distance_m = float(route_data.get("distanceMeters", 0))
        distance_km = round(distance_m / 1000.0, 2)

        polyline = route_data.get("polyline", {}).get("encodedPolyline")
        geometry = {"type": "LineString", "coordinates": decode_polyline(polyline)} if polyline else None

        # Simulate traffic segments for the demo to show clear/mild/heavy colors
        segments = None
        if geometry and "coordinates" in geometry:
            coords = geometry["coordinates"]
            segments = []
            for i in range(len(coords) - 1):
                # Deterministic simulated traffic based on coordinate index
                level = "clear" if i % 3 == 0 else "mild" if i % 3 == 1 else "heavy"
                segments.append({"start_idx": i, "end_idx": i + 1, "level": level})

        return RouteMetrics(
            mode=mode,
            distance_km=distance_km,
            duration_min=duration_min,
            geometry=geometry,
            node_sequence=None,
            source="google-live",
            traffic_segments=segments
        )

    async def route_all_modes(
        self, origin: tuple[float, float], destination: tuple[float, float]
    ) -> dict[str, RouteMetrics]:
        import asyncio

        norm_origin = normalize_coordinates(origin)
        norm_dest = normalize_coordinates(destination)

        async def fetch_mode(mode: str) -> tuple[str, RouteMetrics]:
            try:
                metrics = await self.route(mode, norm_origin, norm_dest)
                return mode, metrics
            except Exception as e:
                logger.warning(f"Failed to route {mode}: {e}")
                return mode, RouteMetrics(mode=mode, distance_km=None, duration_min=None, source="unavailable")

        tracked_modes = ["car", "two_wheeler", "cycling"]
        tasks = [fetch_mode(m) for m in tracked_modes]
        results_list = await asyncio.gather(*tasks)

        return dict(results_list)
