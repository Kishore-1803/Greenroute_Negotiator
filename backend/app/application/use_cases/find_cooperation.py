"""
application/use_cases/find_cooperation.py
"""

import logging

from pydantic import BaseModel

from app.domain.cooperation.entities import CooperationCandidate
from app.domain.cooperation.overlap import (
    assign_cooperation_type,
    compatibility,
)
from app.domain.routing.interfaces import RoutingProvider
from app.infrastructure.cooperation.commuter_pool import COIMBATORE_COMMUTERS
from app.infrastructure.cooperation.transit_hubs import COIMBATORE_TRANSIT_HUBS
from app.application.services.trip_store import TripStore

logger = logging.getLogger(__name__)

class TravelerNegotiationResult(BaseModel):
    user_position: str
    commuter_position: str
    mediator_deal: str
    deal_reached: bool

class CooperationResult(BaseModel):
    candidates: list[CooperationCandidate]
    negotiation: TravelerNegotiationResult | None

class FindCooperationUseCase:
    def __init__(self, routing_provider: RoutingProvider, trip_store: TripStore, negotiation_provider=None):
        self.routing = routing_provider
        self.trip_store = trip_store
        self.commuters = COIMBATORE_COMMUTERS
        self.transit_hubs = COIMBATORE_TRANSIT_HUBS
        self.negotiation_provider = negotiation_provider

    async def execute(self, trip_id: str, departure_hour: float = 8.5) -> CooperationResult:
        # 1. Fetch trip
        trip = self.trip_store.get(trip_id)
        if not trip:
            raise ValueError(f"Trip {trip_id} not found")
        
        user_origin = trip.origin
        user_dest = trip.destination
        
        # Get baseline route to compare against
        try:
            baseline = await self.routing.route("car", user_origin, user_dest)
            user_route_km = baseline.distance_km or 0.0
        except Exception:
            user_route_km = 5.0 # fallback
            
        candidates = []
        for commuter in self.commuters:
            # Quick compatibility check
            comp_score = compatibility(
                user_origin=user_origin,
                user_dest=user_dest,
                user_departure_hour=departure_hour,
                commuter=commuter,
                user_route_km=user_route_km,
                commuter_route_km=10.0 # simplified
            )
            
            if comp_score < 0.2:
                continue
                
            coop_type, hub, hub_dist, last_mile = assign_cooperation_type(
                user_origin, user_dest, commuter, self.transit_hubs
            )
            
            if coop_type is None:
                continue
                
            # Create a basic candidate
            # In a full implementation we would call self.routing.route for the detour
            # but for hackathon speed we'll estimate the detour from haversine
            
            detour_min = commuter.max_detour_min * 0.5
            walk_m = 0
            if coop_type == "relay" and last_mile == "walk" and hub_dist:
                walk_m = hub_dist * 1000
                
            meeting_label = "Origin area"
            split_label = None
            if coop_type == "shared_first_leg":
                split_label = "Along the route"
            
            candidate = CooperationCandidate(
                commuter_id=commuter.id,
                commuter_name=commuter.name,
                commuter_mode=commuter.mode,
                commuter_origin=commuter.origin,
                commuter_destination=commuter.destination,
                compatibility_score=round(comp_score, 2),
                cooperation_type=coop_type,
                meeting_point=user_origin,
                meeting_point_label=meeting_label,
                split_point=user_dest if coop_type == "shared_first_leg" else None,
                split_point_label=split_label,
                relay_hub=hub.location if hub else None,
                relay_hub_label=hub.label if hub else None,
                relay_last_mile_mode=last_mile,
                relay_last_mile_distance_m=int(hub_dist * 1000) if hub_dist else None,
                relay_last_mile_time_min=round((hub_dist * 1000) / 80) if hub_dist else None,
                estimated_detour_min=detour_min,
                estimated_walk_m=walk_m,
                estimated_user_cost_saving_inr=round(user_route_km * 3.0),
                estimated_commuter_cost_saving_inr=round(user_route_km * 2.0),
                estimated_carbon_saved_g=round(user_route_km * 113.0),
                vehicle_trips_prevented=1,
                cooperation_narrative=f"Match found with {commuter.name} via {coop_type}."
            )
            candidates.append(candidate)
            
        # Sort by compatibility
        candidates.sort(key=lambda x: x.compatibility_score, reverse=True)
        top_candidates = candidates[:3]
        
        negotiation = None
        if top_candidates:
            best = top_candidates[0]
            if self.negotiation_provider:
                negotiation = await self.negotiation_provider.negotiate(best, trip, departure_hour)
            else:
                from app.infrastructure.llm.traveler_negotiation_fallback import (
                    FallbackNegotiationProvider,
                )
                negotiation = await FallbackNegotiationProvider().negotiate(best, trip, departure_hour)
            
        return CooperationResult(candidates=top_candidates, negotiation=negotiation)
