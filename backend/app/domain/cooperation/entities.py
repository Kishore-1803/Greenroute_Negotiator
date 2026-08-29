"""
domain/cooperation/entities.py
"""

from dataclasses import dataclass
from typing import Optional

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
    split_point: Optional[tuple[float, float]]
    split_point_label: Optional[str]
    
    # Relay-specific
    relay_hub: Optional[tuple[float, float]]
    relay_hub_label: Optional[str]
    relay_last_mile_mode: Optional[str]     # "walk" | "auto"
    relay_last_mile_distance_m: Optional[int]
    relay_last_mile_time_min: Optional[float]
    
    # Impact estimates
    estimated_detour_min: float
    estimated_walk_m: float
    estimated_user_cost_saving_inr: float
    estimated_commuter_cost_saving_inr: float
    estimated_carbon_saved_g: float
    vehicle_trips_prevented: int
    
    # Narrative
    cooperation_narrative: str
