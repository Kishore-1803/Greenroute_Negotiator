"""
application/use_cases/explain_decision.py

Orchestration only -- this is the one place that knows "try the primary provider, validate
it, fall back on failure or a rejected (hallucinated-number) response". Neither provider
implementation knows about the other or about this policy (Part K).
"""

from __future__ import annotations

import logging

from app.domain.common.errors import DecisionFailureError, ExplanationProviderFailureError
from app.domain.decision.entities import Trip
from app.domain.explanation.entities import ExplanationContext, ExplanationOutput
from app.domain.explanation.interfaces import ExplanationProvider, UnsupportedNumberError, validate_output
from app.application.services.trip_store import TripStore

logger = logging.getLogger(__name__)

TWO_WHEELER_LIMITATION = "two_wheeler route uses an adjusted OSRM car profile, not a dedicated motorcycle router"


def _build_context(trip: Trip, objection_category: str | None, objection_text: str | None) -> ExplanationContext:
    if trip.decision is not None:
        # Advanced flow: a condition-change has produced a real SWITCH/STAY decision.
        decision = trip.decision
        limitations: list[str] = []
        if decision.recommended_mode == "two_wheeler" or trip.current_mode == "two_wheeler":
            limitations.append(TWO_WHEELER_LIMITATION)

        return ExplanationContext(
            current_mode=trip.current_mode,
            recommended_mode=decision.recommended_mode,
            decision=decision.decision,
            utility_advantage=decision.gate_check.utility_gap if decision.gate_check else None,
            time_saved_min=decision.deltas.time_saved_min if decision.deltas else None,
            cost_saved_inr=decision.deltas.cost_saved_inr if decision.deltas else None,
            carbon_saved_g=decision.deltas.carbon_saved_g if decision.deltas else None,
            condition_change_type=trip.condition_change.type if trip.condition_change else "none",
            is_simulated=trip.condition_change.is_simulated if trip.condition_change else False,
            limitations=tuple(limitations),
            objection_category=objection_category,
            objection_text=objection_text,
        )

    # Master Plan primary flow: a brand-new trip has no condition-change decision yet, but it
    # DOES have a utility-computed recommendation (best_mode) that the user is entitled to an
    # explanation of ("why this mode?" -- Master Plan Section 18/19). Synthesize a RECOMMEND
    # context from the baseline utilities instead of refusing to explain anything until the
    # user triggers the advanced condition-change flow.
    if trip.best_mode is None or trip.best_mode not in trip.baseline_utilities:
        raise DecisionFailureError(f"trip {trip.trip_id!r} has no usable recommendation to explain yet")

    utility_advantage = None
    winner_utility = trip.baseline_utilities[trip.best_mode].utility
    runner_up_utilities = [u.utility for mode, u in trip.baseline_utilities.items() if mode != trip.best_mode]
    if runner_up_utilities:
        utility_advantage = round(winner_utility - max(runner_up_utilities), 6)

    limitations = [TWO_WHEELER_LIMITATION] if trip.best_mode == "two_wheeler" else []

    return ExplanationContext(
        current_mode=trip.current_mode,
        recommended_mode=trip.best_mode,
        decision="RECOMMEND",
        utility_advantage=utility_advantage,
        time_saved_min=None,
        cost_saved_inr=None,
        carbon_saved_g=None,
        condition_change_type="none",
        is_simulated=False,
        limitations=tuple(limitations),
        objection_category=objection_category,
        objection_text=objection_text,
    )


class ExplainDecisionUseCase:
    def __init__(
        self,
        primary_provider: ExplanationProvider,
        fallback_provider: ExplanationProvider,
        trip_store: TripStore,
    ):
        self._primary = primary_provider
        self._fallback = fallback_provider
        self._trip_store = trip_store

    async def execute(
        self, trip_id: str, objection_category: str | None = None, objection_text: str | None = None
    ) -> ExplanationOutput:
        trip = self._trip_store.get(trip_id)  # raises TripNotFoundError
        context = _build_context(trip, objection_category, objection_text)

        try:
            output = await self._primary.generate_explanation(context)
            validate_output(context, output)
            return output
        except (ExplanationProviderFailureError, UnsupportedNumberError, ValueError) as exc:
            logger.warning("primary explanation provider rejected/failed (%s); using deterministic fallback", exc)
            return await self._fallback.generate_explanation(context)
