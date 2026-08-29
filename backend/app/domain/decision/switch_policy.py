"""
domain/decision/switch_policy.py

Deterministic dual-gate SWITCH/STAY decision policy -- unchanged from Phase 2's
services/switch_engine.py (moved here for layering only). Current-mode-vs-alternatives,
never "pick the global best and call it SWITCH". Same import restrictions as utility.py.
"""

from __future__ import annotations

from app.domain.decision.entities import Decision, ModeMetrics
from app.domain.decision.value_objects import DecisionDelta, GateCheck, UtilityScore

UTILITY_GATE = 0.15
TIME_SAVED_GATE_MIN = 5.0
COST_SAVED_GATE_INR = 15.0
CARBON_SAVED_GATE_G = 100.0
TIE_EPSILON = 0.01


def _deltas(current: ModeMetrics, alt: ModeMetrics) -> tuple[float, float, float]:
    time_saved = round(current.duration_min - alt.duration_min, 4)
    cost_saved = round(current.estimated_cost_inr - alt.estimated_cost_inr, 4)
    carbon_saved = round(current.estimated_carbon_g - alt.estimated_carbon_g, 4)
    return time_saved, cost_saved, carbon_saved


def evaluate_switch(
    current_mode: str,
    metrics_by_mode: dict[str, ModeMetrics],
    utility_results: dict[str, UtilityScore],
) -> Decision:
    if current_mode not in utility_results or current_mode not in metrics_by_mode:
        return Decision(
            decision="STAY",
            current_mode=current_mode,
            recommended_mode=None,
            deltas=None,
            gate_check=None,
            reason=f"current mode {current_mode!r} has no usable metrics for comparison; defaulting to STAY",
        )

    current_metrics = metrics_by_mode[current_mode]
    current_utility = utility_results[current_mode].utility

    candidates_considered: dict[str, GateCheck] = {}
    passing: list[str] = []

    for mode, result in utility_results.items():
        if mode == current_mode:
            continue
        utility_advantage = round(result.utility - current_utility, 6)
        time_saved, cost_saved, carbon_saved = _deltas(current_metrics, metrics_by_mode[mode])

        relative_gate_passed = utility_advantage >= UTILITY_GATE
        absolute_gate_passed = (
            time_saved >= TIME_SAVED_GATE_MIN
            or cost_saved >= COST_SAVED_GATE_INR
            or carbon_saved >= CARBON_SAVED_GATE_G
        )

        candidates_considered[mode] = GateCheck(
            utility_gap=utility_advantage,
            absolute_gate_passed=absolute_gate_passed,
            time_saved_min=time_saved,
            cost_saved_inr=cost_saved,
            carbon_saved_g=carbon_saved,
        )

        if relative_gate_passed and absolute_gate_passed:
            passing.append(mode)

    if not passing:
        any_alt_better = any(utility_results[m].utility > current_utility for m in utility_results if m != current_mode)
        reason = (
            "no alternative meets the switch threshold; conditions have worsened overall"
            if not any_alt_better and len(utility_results) > 1
            else "no alternative cleared both the utility-advantage and absolute-savings gates"
        )
        return Decision(
            decision="STAY",
            current_mode=current_mode,
            recommended_mode=None,
            deltas=None,
            gate_check=None,
            reason=reason,
            candidates_considered=candidates_considered,
        )

    max_utility = max(utility_results[m].utility for m in passing)
    tied = [m for m in passing if abs(utility_results[m].utility - max_utility) <= TIE_EPSILON]
    winner = tied[0] if len(tied) == 1 else min(tied, key=lambda m: metrics_by_mode[m].estimated_carbon_g)

    gate = candidates_considered[winner]
    return Decision(
        decision="SWITCH",
        current_mode=current_mode,
        recommended_mode=winner,
        deltas=DecisionDelta(
            time_saved_min=gate.time_saved_min,
            cost_saved_inr=gate.cost_saved_inr,
            carbon_saved_g=gate.carbon_saved_g,
        ),
        gate_check=gate,
        reason=f"{winner} clears both gates (utility +{gate.utility_gap}) over {current_mode}",
        candidates_considered=candidates_considered,
    )
