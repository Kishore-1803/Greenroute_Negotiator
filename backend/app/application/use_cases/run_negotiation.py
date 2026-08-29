"""
application/use_cases/run_negotiation.py

Orchestration only -- builds a NegotiationContext from the trip's current state (post-change
metrics if a condition change has happened, otherwise the baseline), tries the primary
(Groq) provider, validates it against the deterministic guardrails, and falls back to the
template provider on any failure or validation rejection. Same try-primary/validate/fallback
policy shape as application/use_cases/explain_decision.py (Part K).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from app.domain.common.errors import DecisionFailureError, NegotiationProviderFailureError
from app.domain.decision.entities import Trip
from app.domain.negotiation.entities import ModeSnapshot, NegotiationContext, NegotiationTranscript
from app.domain.negotiation.interfaces import CoordinatorOverrideError, NegotiationProvider, UnsupportedNumberError, validate_transcript
from app.application.services.trip_store import InMemoryTripStore

logger = logging.getLogger(__name__)


def _build_context(trip: Trip) -> NegotiationContext:
    metrics = trip.post_change_metrics or trip.baseline_metrics
    utilities = trip.post_change_utilities or trip.baseline_utilities
    usable = {mode: m for mode, m in metrics.items() if m.available and mode in utilities}

    if len(usable) < 2:
        raise DecisionFailureError(
            f"trip {trip.trip_id!r} has fewer than 2 usable modes ({sorted(usable)}) -- nothing to negotiate over"
        )

    computed_winner = max(usable, key=lambda mode: utilities[mode].utility)

    return NegotiationContext(
        modes={
            mode: ModeSnapshot(
                mode=mode,
                duration_min=m.duration_min,
                estimated_cost_inr=m.estimated_cost_inr,
                estimated_carbon_g=m.estimated_carbon_g,
            )
            for mode, m in usable.items()
        },
        computed_winner=computed_winner,
        weights_used=trip.weights_used,
    )


@dataclass(frozen=True)
class NegotiationResult:
    transcript: NegotiationTranscript
    computed_winner: str


class RunNegotiationUseCase:
    def __init__(self, primary_provider: NegotiationProvider, fallback_provider: NegotiationProvider, trip_store: InMemoryTripStore):
        self._primary = primary_provider
        self._fallback = fallback_provider
        self._trip_store = trip_store

    async def execute(self, trip_id: str) -> NegotiationResult:
        trip = self._trip_store.get(trip_id)  # raises TripNotFoundError
        context = _build_context(trip)

        try:
            transcript = await self._primary.run_negotiation(context)
            validate_transcript(context, transcript)
            return NegotiationResult(transcript=transcript, computed_winner=context.computed_winner)
        except CoordinatorOverrideError as exc:
            # Distinguished from ordinary provider failure: this means the LLM tried to
            # declare a winner other than the deterministic one -- the exact failure mode
            # Master Plan Section 16 calls out as a CRITICAL guardrail violation. It never
            # reaches the caller; logged loudly here so it's visible in ops, not silent.
            logger.error("GUARDRAIL VIOLATION: coordinator declared %r, computed winner was %r -- using fallback", exc.declared, exc.computed)
            transcript = await self._fallback.run_negotiation(context)
            return NegotiationResult(transcript=transcript, computed_winner=context.computed_winner)
        except (NegotiationProviderFailureError, UnsupportedNumberError, ValueError) as exc:
            logger.warning("primary negotiation provider rejected/failed (%s); using deterministic fallback", exc)
            transcript = await self._fallback.run_negotiation(context)
            return NegotiationResult(transcript=transcript, computed_winner=context.computed_winner)
