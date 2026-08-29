"""
domain/cooperation/entities.py
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class CooperationCandidate:
    commuter_id: str
    commuter_name: str
    commuter_mode: str
    commuter_origin: tuple[float, float]
    commuter_destination: tuple[float, float]
    compatibility_score: float
    cooperation_type: str   # "shared_ride" | "shared_first_leg" | "relay"
    
    # Points
    meeting_point: tuple[float, float]
    meeting_point_label: str
    split_point: tuple[float, float] | None
    split_point_label: str | None
    
    # Relay-specific
    relay_hub: tuple[float, float] | None
    relay_hub_label: str | None
    relay_last_mile_mode: str | None     # "walk" | "auto"
    relay_last_mile_distance_m: int | None
    relay_last_mile_time_min: float | None
    
    # Impact estimates
    estimated_detour_min: float
    estimated_walk_m: float
    estimated_user_cost_saving_inr: float
    estimated_commuter_cost_saving_inr: float
    estimated_carbon_saved_g: float
    vehicle_trips_prevented: int
    
    # Narrative
    cooperation_narrative: str
