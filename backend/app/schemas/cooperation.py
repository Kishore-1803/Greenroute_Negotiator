
from pydantic import BaseModel


class CooperationCandidateDTO(BaseModel):
    commuter_id: str
    commuter_name: str
    commuter_mode: str
    commuter_origin: list[float]
    commuter_destination: list[float]
    compatibility_score: float
    cooperation_type: str
    
    meeting_point: list[float]
    meeting_point_label: str
    split_point: list[float] | None = None
    split_point_label: str | None = None
    
    relay_hub: list[float] | None = None
    relay_hub_label: str | None = None
    relay_last_mile_mode: str | None = None
    relay_last_mile_distance_m: int | None = None
    relay_last_mile_time_min: float | None = None
    
    estimated_detour_min: float
    estimated_walk_m: float
    estimated_user_cost_saving_inr: float
    estimated_commuter_cost_saving_inr: float
    estimated_carbon_saved_g: float
    vehicle_trips_prevented: int
    
    cooperation_narrative: str

class TravelerNegotiationDTO(BaseModel):
    user_position: str
    commuter_position: str
    mediator_deal: str
    deal_reached: bool

class CooperationResponseDTO(BaseModel):
    candidates: list[CooperationCandidateDTO]
    negotiation: TravelerNegotiationDTO | None = None
