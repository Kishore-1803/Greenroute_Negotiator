"""app/schemas/common.py -- transport DTOs shared across routers. Pydantic (validation +
OpenAPI), deliberately separate from the domain dataclasses in app.domain.* (Part E)."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class ModeMetricsDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    mode: str
    distance_km: float | None
    duration_min: float | None
    estimated_cost_inr: float | None
    estimated_carbon_g: float | None
    available: bool
    routing_source: str
    routing_disclosure: str | None = None
    route_geometry: dict | None = None
    stops: list[tuple[float, float]] | None = None
    traffic_segments: list[dict] | None = None


class UtilityScoreDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    mode: str
    norm_time: float
    norm_cost: float
    norm_carbon: float
    utility: float


class GateCheckDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    utility_gap: float
    absolute_gate_passed: bool
    time_saved_min: float
    cost_saved_inr: float
    carbon_saved_g: float


class DecisionDeltaDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    time_saved_min: float
    cost_saved_inr: float
    carbon_saved_g: float


class AgentArgumentDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    agent: str
    round: int
    mode_advocated: str
    message: str
    stance: str | None = None


class CoordinatorNarrationDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    winner: str
    summary: str
    provider: str


class UserPreferenceDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    w_time: float
    w_cost: float
    w_carbon: float
    trip_count: int


class ErrorEnvelope(BaseModel):
    """Consistent shape for every error response -- Part D/N: no stack traces, no
    infrastructure details, just a machine-readable code and a human-readable message."""

    error_code: str
    message: str
    request_id: str | None = None
