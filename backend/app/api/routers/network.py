"""
app/api/routers/network.py

POST /api/v1/network/negotiate -- one traveller, three modes (car / two_wheeler / cycling),
scored by the deterministic utility engine, then argued over by the 2-round Speed/Cost/Carbon
agent panel with a Coordinator that narrates but cannot override the ranking.

This is a single-call convenience wrapper over the same pipeline /api/v1/trips/baseline +
/api/v1/trips/{id}/negotiation expose as two steps. HTTP translation only -- all orchestration
is in NegotiateJourneyUseCase, all logic below that.

(The former ride-pooling endpoints -- /active-trips, /confirm-deal -- and their engine were
moved to experiments/ride_pooling/; that concept is out of scope. See that folder's README.)
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.dependencies import get_negotiate_journey_use_case
from app.application.use_cases.negotiate_journey import NegotiateJourneyUseCase
from app.schemas.common import (
    AgentArgumentDTO,
    CoordinatorNarrationDTO,
    ModeMetricsDTO,
    UserPreferenceDTO,
    UtilityScoreDTO,
)
from app.schemas.network import NetworkNegotiateRequest, NetworkNegotiateResponse

router = APIRouter(prefix="/api/v1/network", tags=["network"])


@router.post("/negotiate", response_model=NetworkNegotiateResponse)
async def negotiate(
    body: NetworkNegotiateRequest,
    use_case: NegotiateJourneyUseCase = Depends(get_negotiate_journey_use_case),
) -> NetworkNegotiateResponse:
    result = await use_case.execute(
        origin=(body.origin_lon, body.origin_lat),
        destination=(body.dest_lon, body.dest_lat),
        user_id=body.user_id,
        stated_priority=body.stated_priority,
        custom_weights=body.custom_weights,
        aqi=body.aqi,
    )
    transcript = result.transcript
    return NetworkNegotiateResponse(
        trip_id=result.trip.trip_id,
        modes=[ModeMetricsDTO.model_validate(m) for m in result.modes],
        raw_modes=[ModeMetricsDTO.model_validate(m) for m in result.raw_modes],
        adjustments=result.adjustments,
        aqi=result.aqi,
        utilities={mode: UtilityScoreDTO.model_validate(u) for mode, u in result.utilities.items()},
        ranking=result.ranking,
        excluded=result.excluded,
        computed_winner=result.computed_winner,
        weights_used=result.weights_used,
        preference=UserPreferenceDTO.model_validate(result.preference),
        round_1=[AgentArgumentDTO.model_validate(a) for a in transcript.round_1],
        round_2=[AgentArgumentDTO.model_validate(a) for a in transcript.round_2],
        coordinator=CoordinatorNarrationDTO.model_validate(transcript.coordinator),
        negotiation_provider=transcript.coordinator.provider,
        negotiation_id=result.negotiation_id,
        winning_mode_cost_inr=result.winning_mode_cost_inr,
    )
