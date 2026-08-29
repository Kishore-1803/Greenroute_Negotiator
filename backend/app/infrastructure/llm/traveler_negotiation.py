"""
infrastructure/llm/traveler_negotiation.py
"""

import json
import logging
from groq import AsyncGroq
from app.domain.cooperation.entities import CooperationCandidate
from app.application.use_cases.find_cooperation import TravelerNegotiationResult
from app.infrastructure.config.settings import Settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are mediating a journey cooperation between two travelers.
Your goal is to propose a fair deal that respects both parties' constraints."""

TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "submit_negotiation",
        "description": "Submit the finalized negotiation transcript and deal.",
        "parameters": {
            "type": "object",
            "properties": {
                "user_position": {"type": "string", "description": "Traveler A's opening position"},
                "commuter_position": {"type": "string", "description": "Traveler B's counter-proposal"},
                "mediator_deal": {"type": "string", "description": "The final deal reached"},
                "deal_reached": {"type": "boolean", "description": "Whether a deal was reached"}
            },
            "required": ["user_position", "commuter_position", "mediator_deal", "deal_reached"]
        }
    }
}

class GroqTravelerNegotiationProvider:
    def __init__(self, settings: Settings):
        self._client = AsyncGroq(api_key=settings.groq_api_key) if settings.groq_api_key else None
        self._model = settings.groq_model_negotiation if hasattr(settings, 'groq_model_negotiation') else "llama3-8b-8192"
        
    def _build_prompt(self, candidate: CooperationCandidate, trip, departure_hour: float) -> str:
        return f"""TRAVELER A (the user):
- Going from {trip.origin} to {trip.destination}
- Departure: {departure_hour}

TRAVELER B (commuter: {candidate.commuter_name}):  
- Going from {candidate.commuter_origin} to {candidate.commuter_destination}
- Maximum walk to meeting point: {candidate.estimated_walk_m}m

PROPOSED COOPERATION: {candidate.cooperation_type}
Meeting point: {candidate.meeting_point_label}

Generate a structured negotiation."""

    async def negotiate(self, candidate: CooperationCandidate, trip, departure_hour: float) -> TravelerNegotiationResult:
        if not self._client:
            from .traveler_negotiation_fallback import FallbackNegotiationProvider
            return await FallbackNegotiationProvider().negotiate(candidate, trip, departure_hour)
            
        try:
            response = await self._client.chat.completions.create(
                model=self._model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": self._build_prompt(candidate, trip, departure_hour)},
                ],
                tools=[TOOL_SCHEMA],
                tool_choice={"type": "function", "function": {"name": "submit_negotiation"}},
                temperature=0.7,
            )
            args = json.loads(response.choices[0].message.tool_calls[0].function.arguments)
            return TravelerNegotiationResult(
                user_position=args["user_position"],
                commuter_position=args["commuter_position"],
                mediator_deal=args["mediator_deal"],
                deal_reached=args.get("deal_reached", True)
            )
        except Exception as exc:
            logger.error(f"Groq negotiation call failed: {exc}")
            from .traveler_negotiation_fallback import FallbackNegotiationProvider
            return await FallbackNegotiationProvider().negotiate(candidate, trip, departure_hour)
