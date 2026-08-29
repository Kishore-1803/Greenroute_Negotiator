"""
app/schemas/network.py

Pydantic DTOs for POST /api/v1/network/negotiate -- the single-traveller, three-mode
(car / two_wheeler / cycling) utility-scored negotiation. This endpoint is a one-shot
convenience wrapper: it runs the same pipeline the /api/v1/trips/* endpoints expose in
separate steps (EvaluateBaselineUseCase -> compute_utility_scores -> RunNegotiationUseCase)
and returns the whole result in a single response.

The earlier ride-pooling ("journey cooperation") DTOs that used to live here were moved to
experiments/ride_pooling/schemas.py -- that concept is out of scope (see that folder's README).
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.schemas.common import (
    AgentArgumentDTO,
    CoordinatorNarrationDTO,
    ModeMetricsDTO,
    UserPreferenceDTO,
    UtilityScoreDTO,
)


class NetworkNegotiateRequest(BaseModel):
    """Same inputs as POST /trips/baseline -- one traveller, one origin/destination pair."""

    origin_lon: float = Field(ge=-180, le=180)
    origin_lat: float = Field(ge=-90, le=90)
    dest_lon: float = Field(ge=-180, le=180)
    dest_lat: float = Field(ge=-90, le=90)
    user_id: str = Field(min_length=1, description="Stable per-caller identity Preference Memory learns weights against")
    stated_priority: str | None = Field(
        default=None,
        description='Cold-start preset for a first-time user_id -- "speed" | "cost" | "carbon" | "balanced". '
        "Ignored for a user_id that already has a learned row, and ignored entirely if custom_weights is given.",
    )
    custom_weights: dict[str, float] | None = Field(
        default=None,
        description='Explicit {"time": .., "cost": .., "carbon": ..} weight vector for THIS call only, '
        "normalized server-side to sum to 1. Takes precedence over stated_priority and the learned vector.",
    )
    aqi: float | None = Field(
        default=None,
        ge=0,
        description="Optional ambient Air Quality Index. Feeds the Carbon specialist's exposure "
        "adjustment; omitted means the carbon channel gets no AQI component (nothing is invented).",
    )


class NetworkNegotiateResponse(BaseModel):
    trip_id: str
    # --- specialist-agent adjustment layer (runs BEFORE scoring) ---
    # raw_modes is the untouched routing+enrichment output; `modes` is what the agents' resolved
    # adjustments turned it into, and therefore what compute_utility_scores consumed.
    # `adjustments` itemises each proposal, its reason, and whether the clamp bound it.
    raw_modes: list[ModeMetricsDTO] = []
    adjustments: dict | None = None
    aqi: float | None = None
    # --- deterministic utility layer (the ranking the Coordinator may narrate but never override) ---
    modes: list[ModeMetricsDTO]
    utilities: dict[str, UtilityScoreDTO]
    ranking: list[str] = Field(description="Usable modes, highest utility first. ranking[0] == computed_winner.")
    excluded: dict[str, str] = Field(description="mode -> why it was dropped before scoring")
    computed_winner: str = Field(description="argmax(utility) -- the single recommendation")
    weights_used: dict[str, float]
    preference: UserPreferenceDTO
    # --- negotiation layer (narration only) ---
    round_1: list[AgentArgumentDTO]
    round_2: list[AgentArgumentDTO]
    coordinator: CoordinatorNarrationDTO
    negotiation_provider: str = Field(description='"groq" | "deterministic-fallback"')
    # --- audit trail ---
    negotiation_id: str
    winning_mode_cost_inr: float | None = Field(
        description="estimated_cost_inr of computed_winner -- the ONE cost figure this negotiation turns on "
        "(replaces the old ambiguous negotiation_log.cost_saved_inr, which conflated pooled-ride savings "
        "with an agreed cost share)."
    )
