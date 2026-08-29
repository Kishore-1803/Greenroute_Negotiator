"""
domain/decision/utility.py

Deterministic utility engine -- the FINAL Blueprint formula (Phase 2's services/utility_engine.py,
moved here as part of Phase 3's layering). See CLAUDE.md Section 10 for the frozen math this
must never deviate from -- "frozen" means the normalization/aggregation *shape*, not the
weights: Phase 6 (Master Plan Section 3/5's Preference Memory) makes the weight vector an
explicit, optional input so a per-user learned vector can replace the fixed default without
touching the formula itself.

    norm(m) = (max_value - value(m)) / (max_value - min_value); norm(m) = 1 if max==min
    Utility(m) = w_time * norm_time(m) + w_cost * norm_cost(m) + w_carbon * norm_carbon(m)
    default weights (no Preference Memory vector supplied): 0.45 / 0.30 / 0.25

This module imports ONLY app.domain.* -- no FastAPI, no Groq, no OSRM, no httpx, no DB, no
env/config frameworks, no Docker. Enforced by tests/architecture/test_layering.py.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

from app.domain.decision.entities import ModeMetrics
from app.domain.decision.value_objects import UtilityScore

W_TIME = 0.45
W_COST = 0.30
W_CARBON = 0.25


@dataclass(frozen=True)
class UtilityEngineOutput:
    results: dict[str, UtilityScore]  # mode -> UtilityScore, usable modes only
    excluded: dict[str, str]  # mode -> human-readable reason it was dropped


def _is_malformed(value) -> bool:
    if value is None:
        return True
    if isinstance(value, float) and math.isnan(value):
        return True
    return value < 0


def _usable_metrics(modes: list[ModeMetrics]) -> tuple[dict[str, ModeMetrics], dict[str, str]]:
    usable: dict[str, ModeMetrics] = {}
    excluded: dict[str, str] = {}
    for m in modes:
        if not m.available:
            excluded[m.mode] = "mode marked unavailable (routing or enrichment failed)"
            continue
        if _is_malformed(m.duration_min) or _is_malformed(m.estimated_cost_inr) or _is_malformed(m.estimated_carbon_g):
            excluded[m.mode] = "malformed metrics (missing, NaN, or negative value)"
            continue
        usable[m.mode] = m
    return usable, excluded


def _normalize(values: dict[str, float]) -> dict[str, float]:
    """DELIBERATE DEVIATION from the original Master Plan PDF's literal tie formula (which
    specified norm(m) = 0 when max == min). Returning 0 on a tie would score every tied mode as
    if it were the WORST possible outcome on that metric -- e.g. if all three modes cost exactly
    the same, norm_cost=0 would penalize all of them on cost as hard as the single most expensive
    mode in a non-tied comparison, which is not what "tied" means. Returning 1.0 instead scores a
    tie as "no disadvantage on this metric", which is the mathematically defensible reading and
    is what tests/domain/decision/test_utility.py asserts for every tie case (single-metric and
    all-metrics). Kept because switching to the literal 0 would be a genuine product regression,
    not because the literal wording was ignored."""
    if not values:
        return {}
    vals = list(values.values())
    max_v, min_v = max(vals), min(vals)
    if max_v == min_v:
        return {k: 1.0 for k in values}
    return {k: (max_v - v) / (max_v - min_v) for k, v in values.items()}


def compute_utility_scores(modes: list[ModeMetrics], weights: dict[str, float] | None = None) -> UtilityEngineOutput:
    """weights, if given, must have "time"/"cost"/"carbon" keys (e.g. UserPreference.as_weights())
    and need not sum to 1 -- callers that pass a Preference Memory vector are expected to have
    already renormalized it; this function does not re-check that invariant, it just applies
    whatever three numbers it is given."""
    w_time = weights["time"] if weights else W_TIME
    w_cost = weights["cost"] if weights else W_COST
    w_carbon = weights["carbon"] if weights else W_CARBON

    usable, excluded = _usable_metrics(modes)

    if not usable:
        return UtilityEngineOutput(results={}, excluded=excluded)

    norm_time = _normalize({mode: m.duration_min for mode, m in usable.items()})
    norm_cost = _normalize({mode: m.estimated_cost_inr for mode, m in usable.items()})
    norm_carbon = _normalize({mode: m.estimated_carbon_g for mode, m in usable.items()})

    results = {}
    for mode in usable:
        utility = w_time * norm_time[mode] + w_cost * norm_cost[mode] + w_carbon * norm_carbon[mode]
        results[mode] = UtilityScore(
            mode=mode,
            norm_time=round(norm_time[mode], 6),
            norm_cost=round(norm_cost[mode], 6),
            norm_carbon=round(norm_carbon[mode], 6),
            utility=round(utility, 6),
        )

    return UtilityEngineOutput(results=results, excluded=excluded)
