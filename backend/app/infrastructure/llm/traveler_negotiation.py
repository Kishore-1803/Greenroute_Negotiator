"""
infrastructure/llm/traveler_negotiation.py

Groq LLM negotiation provider using structured JSON output mode.
Avoids tool-calling 400 schema mismatches on Groq endpoints.
"""

import json
import logging
import re
from groq import AsyncGroq
from app.domain.cooperation.entities import CooperationCandidate
from app.application.use_cases.find_cooperation import TravelerNegotiationResult
from app.infrastructure.config.settings import Settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an AI mediator negotiating a rideshare/journey cooperation between two travelers.
Your goal is to propose a fair deal that respects both parties' constraints.

You MUST reply with a valid, raw JSON object matching this exact schema:
{
  "user_position": "Traveler A's opening perspective and constraints",
  "commuter_position": "Traveler B's counter-proposal and willingness to meet",
  "mediator_deal": "The final compromise deal agreed upon by both parties",
  "deal_reached": true
}
Do not include any conversational filler, markdown fences, or extra text outside the JSON object."""


class GroqTravelerNegotiationProvider:
    def __init__(self, settings: Settings):
        self._client = AsyncGroq(api_key=settings.groq_api_key) if settings.groq_api_key else None
        self._model = getattr(settings, 'groq_model_negotiation', 'llama-3.3-70b-versatile')

    def _build_prompt(self, candidate: CooperationCandidate, trip, departure_hour: float) -> str:
        return f"""TRAVELER A (User):
- Route: From {trip.origin} to {trip.destination}
- Departure: {departure_hour}:00

TRAVELER B (Commuter: {candidate.commuter_name}):  
- Route: From {candidate.commuter_origin} to {candidate.commuter_destination}
- Maximum walk to meeting point: {candidate.estimated_walk_m}m

PROPOSED COOPERATION: {candidate.cooperation_type}
- Meeting Point: {candidate.meeting_point_label}

Synthesize a realistic negotiation and return the structured JSON object."""

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
                response_format={"type": "json_object"},
                temperature=0.4,
                max_tokens=1024,
            )
            content = response.choices[0].message.content or "{}"
            
            # Robust JSON extraction in case of leading/trailing whitespace
            try:
                args = json.loads(content)
            except json.JSONDecodeError:
                json_match = re.search(r"\{.*\}", content, re.DOTALL)
                if json_match:
                    args = json.loads(json_match.group(0))
                else:
                    raise ValueError(f"Could not parse JSON from LLM response: {content[:100]}")

            return TravelerNegotiationResult(
                user_position=args.get("user_position", "Agreed on sharing the route to cut down emissions."),
                commuter_position=args.get("commuter_position", f"Willing to walk up to {candidate.estimated_walk_m}m to the meeting hub."),
                mediator_deal=args.get("mediator_deal", f"Meet at {candidate.meeting_point_label} for a combined eco-ride."),
                deal_reached=args.get("deal_reached", True),
            )
        except Exception as exc:
            logger.warning(f"Groq negotiation call failed ({exc}); using fallback provider")
            from .traveler_negotiation_fallback import FallbackNegotiationProvider
            return await FallbackNegotiationProvider().negotiate(candidate, trip, departure_hour)
