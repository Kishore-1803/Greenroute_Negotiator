"""
application/use_cases/negotiate_journey.py

One-shot orchestration for POST /api/v1/network/negotiate: run the baseline (route all 3
modes -> ModeMetrics -> compute_utility_scores) and then the 2-round Speed/Cost/Carbon
negotiation + guardrailed Coordinator on the resulting trip, and persist an audit-trail row.

This composes the two existing use cases (EvaluateBaselineUseCase, RunNegotiationUseCase)
rather than reimplementing either -- it is glue, not logic. The recommendation is always
EvaluateBaselineUseCase's utility winner; RunNegotiationUseCase can only narrate it
(domain.negotiation.interfaces.validate_transcript enforces that).
"""

from __future__ import annotations

import json
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime, timezone

from app.application.services.negotiation_log_store import NegotiationLogRecord, NegotiationLogStore
from app.application.use_cases.evaluate_baseline import EvaluateBaselineUseCase
from app.application.use_cases.run_negotiation import RunNegotiationUseCase
from app.domain.decision.entities import ModeMetrics, Trip
from app.domain.decision.value_objects import UtilityScore
from app.domain.negotiation.entities import NegotiationTranscript
from app.domain.preference.entities import UserPreference


@dataclass(frozen=True)
class NegotiateJourneyResult:
    trip: Trip
    modes: list[ModeMetrics]          # ADJUSTED -- what the utility formula actually scored
    raw_modes: list[ModeMetrics]      # untouched routing+enrichment output, for comparison
    adjustments: dict | None          # every delta the specialists applied, and why
    aqi: float | None
    utilities: dict[str, UtilityScore]
    ranking: list[str]
    excluded: dict[str, str]
    computed_winner: str
    weights_used: dict[str, float]
    preference: UserPreference
    transcript: NegotiationTranscript
    negotiation_id: str
    winning_mode_cost_inr: float | None


class NegotiateJourneyUseCase:
    def __init__(
        self,
        evaluate_baseline: EvaluateBaselineUseCase,
        run_negotiation: RunNegotiationUseCase,
        negotiation_log_store: NegotiationLogStore,
    ):
        self._evaluate_baseline = evaluate_baseline
        self._run_negotiation = run_negotiation
        self._log = negotiation_log_store

    async def execute(
        self,
        origin: tuple[float, float],
        destination: tuple[float, float],
        user_id: str,
        stated_priority: str | None,
        custom_weights: dict[str, float] | None,
        aqi: float | None = None,
    ) -> NegotiateJourneyResult:
        # The specialists' bounded adjustments are applied inside this call, BEFORE
        # compute_utility_scores runs -- so the ranking below is already agent-influenced.
        baseline = await self._evaluate_baseline.execute(
            origin, destination, None, user_id, stated_priority, custom_weights, aqi=aqi
        )
        trip = baseline.trip

        negotiation = await self._run_negotiation.execute(trip.trip_id)
        computed_winner = negotiation.computed_winner

        ranking = sorted(
            trip.baseline_utilities,
            key=lambda mode: trip.baseline_utilities[mode].utility,
            reverse=True,
        )
        winner_metrics = trip.baseline_metrics.get(computed_winner)

        negotiation_id = f"NEG_{uuid.uuid4().hex[:12].upper()}"
        self._log.append(
            NegotiationLogRecord(
                negotiation_id=negotiation_id,
                trip_id=trip.trip_id,
                user_id=user_id,
                computed_winner=computed_winner,
                winning_mode_cost_inr=winner_metrics.estimated_cost_inr if winner_metrics else None,
                winning_mode_carbon_g=winner_metrics.estimated_carbon_g if winner_metrics else None,
                winning_mode_duration_min=winner_metrics.duration_min if winner_metrics else None,
                round_1_json=json.dumps([asdict(a) for a in negotiation.transcript.round_1]),
                round_2_json=json.dumps([asdict(a) for a in negotiation.transcript.round_2]),
                coordinator_json=json.dumps(asdict(negotiation.transcript.coordinator)),
                negotiation_provider=negotiation.transcript.coordinator.provider,
                weights_used_json=json.dumps(trip.weights_used),
                created_at=datetime.now(timezone.utc).isoformat(),
            )
        )

        return NegotiateJourneyResult(
            trip=trip,
            modes=list(trip.baseline_metrics.values()),
            raw_modes=list(trip.raw_metrics.values()),
            adjustments=trip.adjustments,
            aqi=trip.aqi,
            utilities=trip.baseline_utilities,
            ranking=ranking,
            excluded=baseline.excluded,
            computed_winner=computed_winner,
            weights_used=trip.weights_used,
            preference=baseline.preference,
            transcript=negotiation.transcript,
            negotiation_id=negotiation_id,
            winning_mode_cost_inr=winner_metrics.estimated_cost_inr if winner_metrics else None,
        )
