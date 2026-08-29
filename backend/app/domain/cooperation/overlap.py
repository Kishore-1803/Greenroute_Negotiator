"""
domain/cooperation/overlap.py
"""

import math

from app.infrastructure.cooperation.transit_hubs import TransitHub

RELAY_WALK_MAX_HAVERSINE_KM = 0.6
RELAY_AUTO_MAX_HAVERSINE_KM = 1.5

def haversine(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    return R * 2 * math.asin(math.sqrt(a))

def find_nearest_hub(location: tuple[float, float], hubs: list[TransitHub]) -> tuple[TransitHub | None, float]:
    best_hub = None
    best_dist = float('inf')
    for hub in hubs:
        d = haversine(location[0], location[1], hub.location[0], hub.location[1])
        if d < best_dist:
            best_dist = d
            best_hub = hub
    return best_hub, best_dist

def compute_route_overlap(user_origin, user_dest, commuter) -> float:
    # A simplified overlap fraction based on proximity of origins and destinations.
    # In a full system, this would compare polyline segments.
    # For now, if origins are close and dests are close, overlap is high.
    d_orig = haversine(*user_origin, *commuter.origin)
    d_dest = haversine(*user_dest, *commuter.destination)
    # Scale: 0 distance = 1.0 overlap, 5km distance = 0.0 overlap
    overlap = max(0.0, 1.0 - ((d_orig + d_dest) / 10.0))
    return overlap

def estimate_detour_fraction(user_origin, user_dest, commuter) -> float:
    # Estimate the detour as a fraction of the original route length
    base_dist = haversine(*user_origin, *user_dest)
    if base_dist == 0:
        return 1.0
    detour_dist = haversine(*user_origin, *commuter.origin) + haversine(*commuter.destination, *user_dest)
    return min(1.0, detour_dist / base_dist)

def time_mismatch_penalty(user_departure_hour: float, commuter) -> float:
    gap_hours = abs(user_departure_hour - commuter.departure_hour)
    window = commuter.departure_window_min / 60.0
    if gap_hours <= window:
        return 0.0
    return min(1.0, (gap_hours - window) / 2.0)

def carbon_saved_fraction(user_route_km: float, commuter_route_km: float) -> float:
    # Approximate carbon saved by not taking a separate car.
    return 1.0

def cost_saved_fraction(commuter) -> float:
    # Approximate cost saved
    return 1.0

def compatibility(user_origin, user_dest, user_departure_hour: float,
                  commuter, user_route_km: float, commuter_route_km: float) -> float:
    alpha, beta, gamma, delta, epsilon = 0.35, 0.20, 0.25, 0.10, 0.10
    
    overlap = compute_route_overlap(user_origin, user_dest, commuter)
    detour = estimate_detour_fraction(user_origin, user_dest, commuter)
    time_m = time_mismatch_penalty(user_departure_hour, commuter)
    carbon_s = carbon_saved_fraction(user_route_km, commuter_route_km)
    cost_s = cost_saved_fraction(commuter)
    
    return alpha * overlap - beta * detour - gamma * time_m + delta * carbon_s + epsilon * cost_s

def assign_cooperation_type(user_origin, user_dest, commuter, transit_hubs: list[TransitHub]) -> tuple[str | None, TransitHub | None, float | None, str | None]:
    nearest_hub, hub_dist = find_nearest_hub(commuter.destination, transit_hubs)
    relay_eligible = hub_dist <= RELAY_AUTO_MAX_HAVERSINE_KM
    
    last_mile_mode = None
    if relay_eligible:
        last_mile_mode = "walk" if hub_dist <= RELAY_WALK_MAX_HAVERSINE_KM else "auto"
    
    # Based on road tests, road distance is ~1.5x haversine.
    # 1.5km haversine = ~2.2km road distance. Good for "same area" matching.
    origins_close = haversine(*user_origin, *commuter.origin) <= 1.5
    dests_close = haversine(*user_dest, *commuter.destination) <= 1.5
    
    if origins_close and dests_close:
        return "shared_ride", None, None, None
    elif origins_close and not dests_close:
        return "shared_first_leg", None, None, None
    elif relay_eligible and not origins_close:
        return "relay", nearest_hub, hub_dist, last_mile_mode
    else:
        return None, None, None, None  # Default fallback as requested
