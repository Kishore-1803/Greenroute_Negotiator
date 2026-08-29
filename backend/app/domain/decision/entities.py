"""
domain/decision/entities.py

Core domain entities. Pure Python dataclasses -- no pydantic, no FastAPI. Transport DTOs for
the API layer live in app/schemas/ and are converted to/from these explicitly (Part E: "Do NOT
allow API schemas to become domain objects automatically").
"""

from __future__ import annotations

from dataclasses import dataclass, field

from app.domain.decision.value_objects import DecisionDelta, GateCheck, UtilityScore

TRACKED_MODES = ("car", "two_wheeler", "cycling")


@dataclass(frozen=True)
class ModeMetrics:
    """FROZEN contract (Phase 2, carried forward unchanged into the domain layer). Extended
    (Phase 5, additive-only) with route_geometry for map rendering -- does not touch cost,
    carbon, distance, duration, or any field the utility/switch engines read."""
    mode: str
    distance_km: float | None
    duration_min: float | None
    estimated_cost_inr: float | None
    estimated_carbon_g: float | None
    available: bool
    routing_source: str  # "osrm-live" | "osrm-cache" | "unavailable"
    routing_disclosure: str | None = None
    route_geometry: dict | None = None  # raw OSRM GeoJSON LineString, render-only


@dataclass(frozen=True)
class ConditionChange:
    type: str  # e.g. "simulated_traffic_surge"
    is_simulated: bool


@dataclass
class Decision:
    decision: str  # "SWITCH" | "STAY"
    current_mode: str
    recommended_mode: str | None
    deltas: DecisionDelta | None
    gate_check: GateCheck | None
    reason: str
    candidates_considered: dict[str, GateCheck] = field(default_factory=dict)


@dataclass
class Trip:
    """In-memory aggregate for one baseline-through-decision session (no DB in this MVP --
    see application/services/trip_store.py for the repository interface/implementation)."""
    trip_id: str
    origin: tuple[float, float]
    destination: tuple[float, float]
    current_mode: str
    # The metrics compute_utility_scores ACTUALLY consumed -- i.e. post-agent-adjustment (see
    # domain/negotiation/adjustments.py). Named "baseline" for the trip's pre-condition-change
    # state, not for "unadjusted": every existing consumer (negotiation context, switch policy,
    # explanation) wants the figures the ranking was computed from, which are these. The
    # untouched routing/enrichment output is kept alongside as raw_metrics below.
    baseline_metrics: dict[str, ModeMetrics]
    baseline_utilities: dict[str, UtilityScore]
    condition_change: ConditionChange | None = None
    post_change_metrics: dict[str, ModeMetrics] | None = None
    post_change_utilities: dict[str, UtilityScore] | None = None
    decision: Decision | None = None
    # Phase 6 (Preference Memory, Master Plan Section 3): the weight vector this trip's
    # utility scores were actually computed with, and the user_id it came from -- both needed
    # so a later mode-selection can be attributed to the right learned preference row and to
    # keep post-condition-change utility recomputation consistent with the baseline's weights.
    weights_used: dict[str, float] = field(default_factory=dict)
    user_id: str = ""
    # Master Plan primary flow (new-trip recommendation): the utility-winning mode at baseline
    # time, before any condition-change/SWITCH-STAY decision exists. record_selection.py reads
    # this -- NOT current_mode -- as "what the system was recommending" for a trip that never
    # went through a condition change, so the Preference Memory learning signal is attributed
    # against the actual recommendation, not an unrelated "starting mode" input.
    best_mode: str | None = None
    # Agent-adjustment audit trail (domain/negotiation/adjustments.py). raw_metrics is the
    # untouched routing+enrichment output; baseline_metrics above is what the specialists'
    # resolved adjustments turned it into, and therefore what was scored. Keeping both is what
    # makes "which agent moved which number, and by how much" answerable after the fact rather
    # than a claim -- and what lets the ablation compare like with like.
    raw_metrics: dict[str, ModeMetrics] = field(default_factory=dict)
    adjustments: dict | None = None
    aqi: float | None = None
    weather: dict | None = None
