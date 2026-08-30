"""
app/api/routers/trips.py

HTTP translation only (Part A's Modularity Rule) -- parses requests into use-case calls,
converts domain results into response DTOs. No routing, enrichment, utility, switch, or LLM
logic lives here.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Any

from app.api.dependencies import (
    get_evaluate_baseline_use_case,
    get_explain_decision_use_case,
    get_find_cooperation_use_case,
    get_record_selection_use_case,
    get_record_trip_memory_use_case,
    get_retrieve_trip_memory_use_case,
    get_run_negotiation_use_case,
    get_trigger_condition_change_use_case,
)
from app.application.use_cases.evaluate_baseline import EvaluateBaselineUseCase
from app.application.use_cases.explain_decision import ExplainDecisionUseCase
from app.application.use_cases.find_cooperation import FindCooperationUseCase
from app.application.use_cases.record_selection import RecordSelectionUseCase
from app.application.use_cases.record_trip_memory import RecordTripMemoryUseCase
from app.application.use_cases.retrieve_trip_memory import RetrieveTripMemoryUseCase
from app.application.use_cases.run_negotiation import RunNegotiationUseCase
from app.application.use_cases.trigger_condition_change import (
    TriggerConditionChangeUseCase,
)
from app.schemas.common import (
    AgentArgumentDTO,
    CoordinatorNarrationDTO,
    DecisionDeltaDTO,
    GateCheckDTO,
    ModeMetricsDTO,
    UserPreferenceDTO,
    UtilityScoreDTO,
)
from app.schemas.cooperation import CooperationResponseDTO
from app.schemas.requests import BaselineRequest, ExplanationRequest, SelectionRequest
from app.schemas.responses import (
    BaselineResponse,
    ConditionChangeResponse,
    DecisionDTO,
    ExplanationResponse,
    NegotiationResponse,
    SelectionResponse,
    StateSnapshotDTO,
)

router = APIRouter(prefix="/api/v1/trips", tags=["trips"])

TRAFFIC_DISCLOSURE = (
    "Traffic conditions in this demo are SIMULATED: a real OSRM segment-speed-file + "
    "osrm-customize recomputation is run against the car routing dataset, but the underlying "
    "speed change is authored for this demo, not sensed from live traffic."
)


@router.post("/baseline", response_model=BaselineResponse)
async def baseline(
    body: BaselineRequest,
    use_case: EvaluateBaselineUseCase = Depends(get_evaluate_baseline_use_case),
    retrieve_memory_use_case: RetrieveTripMemoryUseCase = Depends(get_retrieve_trip_memory_use_case),
) -> BaselineResponse:
    origin = (body.origin_lon, body.origin_lat)
    destination = (body.dest_lon, body.dest_lat)
    result = await use_case.execute(
        origin, destination, body.current_mode, body.user_id, body.stated_priority,
        body.custom_weights, body.willing_to_carpool, body.aqi,
    )
    
    # Optional: fetch similar past trips
    # Distance approx logic could be shared, but for demo we extract max route distance
    dist_km = 0.0
    if result.trip.baseline_metrics:
        first_mode = list(result.trip.baseline_metrics.values())[0]
        dist_km = first_mode.distance_km
    similar_trips = retrieve_memory_use_case.execute(user_id=body.user_id, distance_km=dist_km)
    similar_trips_data = [
        {
            "distance_band": t.distance_band,
            "time_band": t.time_band,
            "recommended_mode": t.recommended_mode,
            "selected_mode": t.selected_mode,
            "reason_text": t.reason_text
        } for t in similar_trips
    ]

    return BaselineResponse(
        trip_id=result.trip.trip_id,
        current_mode=result.trip.current_mode,
        modes=[ModeMetricsDTO.model_validate(m) for m in result.trip.baseline_metrics.values()],
        raw_modes=[ModeMetricsDTO.model_validate(m) for m in result.trip.raw_metrics.values()],
        adjustments=result.trip.adjustments,
        aqi=result.trip.aqi,
        utilities={mode: UtilityScoreDTO.model_validate(u) for mode, u in result.trip.baseline_utilities.items()},
        excluded=result.excluded,
        best_mode=result.best_mode,
        preference=UserPreferenceDTO.model_validate(result.preference),
        weights_used=result.trip.weights_used,
        similar_past_trips=similar_trips_data,
    )


@router.post("/{trip_id}/selection", response_model=SelectionResponse)
async def selection(
    trip_id: str,
    body: SelectionRequest,
    background_tasks: BackgroundTasks,
    use_case: RecordSelectionUseCase = Depends(get_record_selection_use_case),
    record_memory_use_case: RecordTripMemoryUseCase = Depends(get_record_trip_memory_use_case),
) -> SelectionResponse:
    result = use_case.execute(
        trip_id=trip_id,
        selected_mode=body.selected_mode,
        cooperation_used=body.cooperation_used,
        origin_name=body.origin_name,
        destination_name=body.destination_name,
        duration_min=body.duration_min,
    )
    
    # We estimate a dummy distance based on duration for the memory recording
    # (In a real app, distance would be passed via selection or looked up from DB)
    distance_km = (body.duration_min or 30.0) * 0.5  # Rough estimate: 30km/h
    
    background_tasks.add_task(
        record_memory_use_case.execute,
        trip_id=trip_id,
        user_id=result.preference.user_id,
        distance_km=distance_km,
        recommended_mode=result.recommended_mode,
        selected_mode=body.selected_mode,
        preference=result.preference
    )

    return SelectionResponse(
        trip_id=trip_id,
        selected_mode=body.selected_mode,
        recommended_mode=result.recommended_mode,
        weights_changed=result.weights_changed,
        preference=UserPreferenceDTO.model_validate(result.preference),
    )


@router.post("/{trip_id}/condition-change", response_model=ConditionChangeResponse)
async def condition_change(
    trip_id: str,
    use_case: TriggerConditionChangeUseCase = Depends(get_trigger_condition_change_use_case),
) -> ConditionChangeResponse:
    result = await use_case.execute(trip_id)
    trip = result.trip
    decision = trip.decision

    return ConditionChangeResponse(
        trip_id=trip.trip_id,
        before=StateSnapshotDTO(
            modes=[ModeMetricsDTO.model_validate(m) for m in trip.baseline_metrics.values()],
            utilities={mode: UtilityScoreDTO.model_validate(u) for mode, u in trip.baseline_utilities.items()},
        ),
        after=StateSnapshotDTO(
            modes=[ModeMetricsDTO.model_validate(m) for m in trip.post_change_metrics.values()],
            utilities={mode: UtilityScoreDTO.model_validate(u) for mode, u in trip.post_change_utilities.items()},
            excluded=result.excluded,
        ),
        switch_decision=DecisionDTO(
            decision=decision.decision,
            current_mode=decision.current_mode,
            recommended_mode=decision.recommended_mode,
            deltas=DecisionDeltaDTO.model_validate(decision.deltas) if decision.deltas else None,
            gate_check=GateCheckDTO.model_validate(decision.gate_check) if decision.gate_check else None,
            reason=decision.reason,
        ),
        traffic_disclosure=TRAFFIC_DISCLOSURE,
        surge_experiment_timings=result.timings,
    )


@router.post("/{trip_id}/negotiation", response_model=NegotiationResponse)
async def negotiation(
    trip_id: str,
    use_case: RunNegotiationUseCase = Depends(get_run_negotiation_use_case),
) -> NegotiationResponse:
    result = await use_case.execute(trip_id)
    transcript = result.transcript
    return NegotiationResponse(
        trip_id=trip_id,
        round_1=[AgentArgumentDTO.model_validate(a) for a in transcript.round_1],
        round_2=[AgentArgumentDTO.model_validate(a) for a in transcript.round_2],
        coordinator=CoordinatorNarrationDTO.model_validate(transcript.coordinator),
        computed_winner=result.computed_winner,
    )


@router.post("/{trip_id}/cooperation", response_model=CooperationResponseDTO)
async def cooperation(
    trip_id: str,
    departure_hour: float = 8.5,
    use_case: FindCooperationUseCase = Depends(get_find_cooperation_use_case),
) -> CooperationResponseDTO:
    result = await use_case.execute(trip_id, departure_hour)
    return CooperationResponseDTO.model_validate(result.model_dump())


@router.post("/{trip_id}/explanation", response_model=ExplanationResponse)
async def explanation(
    trip_id: str,
    body: ExplanationRequest = ExplanationRequest(),
    use_case: ExplainDecisionUseCase = Depends(get_explain_decision_use_case),
) -> ExplanationResponse:
    output = await use_case.execute(trip_id, body.objection_category, body.objection_text)
    return ExplanationResponse(
        summary=output.summary,
        reason=output.reason,
        decision=output.decision,
        limitations=list(output.limitations),
        confidence_note=output.confidence_note,
        provider=output.provider,
    )
