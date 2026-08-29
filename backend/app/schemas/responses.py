"""app/schemas/responses.py -- outbound DTOs. Structured JSON only -- no presentation text
baked in here beyond what the explanation use case itself already produced (Part H)."""

from __future__ import annotations

from pydantic import BaseModel

from app.schemas.common import (
    AgentArgumentDTO,
    CoordinatorNarrationDTO,
    DecisionDeltaDTO,
    GateCheckDTO,
    ModeMetricsDTO,
    UserPreferenceDTO,
    UtilityScoreDTO,
)


class HealthResponse(BaseModel):
    status: str
    environment: str


class BaselineResponse(BaseModel):
    trip_id: str
    current_mode: str
    modes: list[ModeMetricsDTO]
    utilities: dict[str, UtilityScoreDTO]
    excluded: dict[str, str]
    best_mode: str | None
    preference: UserPreferenceDTO
    weights_used: dict[str, float]


class SelectionResponse(BaseModel):
    trip_id: str
    selected_mode: str
    recommended_mode: str
    weights_changed: bool
    preference: UserPreferenceDTO


class DecisionDTO(BaseModel):
    decision: str
    current_mode: str
    recommended_mode: str | None
    deltas: DecisionDeltaDTO | None
    gate_check: GateCheckDTO | None
    reason: str


class StateSnapshotDTO(BaseModel):
    modes: list[ModeMetricsDTO]
    utilities: dict[str, UtilityScoreDTO]
    excluded: dict[str, str] = {}


class ConditionChangeResponse(BaseModel):
    trip_id: str
    before: StateSnapshotDTO
    after: StateSnapshotDTO
    switch_decision: DecisionDTO
    traffic_disclosure: str
    surge_experiment_timings: dict


class NegotiationResponse(BaseModel):
    trip_id: str
    round_1: list[AgentArgumentDTO]
    round_2: list[AgentArgumentDTO]
    coordinator: CoordinatorNarrationDTO
    computed_winner: str


class ExplanationResponse(BaseModel):
    summary: str
    reason: str
    decision: str
    limitations: list[str]
    confidence_note: str
    provider: str
