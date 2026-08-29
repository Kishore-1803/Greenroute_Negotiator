"""
infrastructure/llm/traveler_negotiation_fallback.py
"""

from app.application.use_cases.find_cooperation import TravelerNegotiationResult
from app.domain.cooperation.entities import CooperationCandidate


class FallbackNegotiationProvider:
    async def negotiate(self, candidate: CooperationCandidate, trip, departure_hour: float) -> TravelerNegotiationResult:
        if candidate.cooperation_type == "shared_ride":
            deal = f"Full journey shared. Meet at {candidate.meeting_point_label}."
        elif candidate.cooperation_type == "shared_first_leg":
            deal = f"Share ride to {candidate.split_point_label}, then split."
        elif candidate.cooperation_type == "relay":
            deal = f"Share ride to {candidate.relay_hub_label}. {candidate.commuter_name} continues by {candidate.relay_last_mile_mode}."
        else:
            deal = "Cooperation agreed."
            
        return TravelerNegotiationResult(
            user_position="I am looking for a ride to my destination.",
            commuter_position=f"I can offer a {candidate.cooperation_type} if it fits my route.",
            mediator_deal=f"Deal reached: {deal} Both parties save costs and reduce emissions.",
            deal_reached=True
        )
