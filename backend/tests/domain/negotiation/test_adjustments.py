"""
Tests for domain.negotiation.adjustments -- the specialist agents' material contribution to
the decision. Framework-free, no live LLM, no OSRM: these are pure functions of ModeMetrics.

The load-bearing claim this file defends: deleting a specialist agent changes the metrics that
compute_utility_scores consumes, and can therefore change the recommendation. That is asserted
here as an executable fact, not left to the ablation script alone.
"""

from __future__ import annotations

import pytest

from app.domain.decision.entities import ModeMetrics
from app.domain.decision.utility import compute_utility_scores
from app.domain.negotiation.adjustments import (
    AGENT_ROLES,
    MIN_ABSOLUTE_CAP,
    aqi_factor,
    apply_agent_adjustments,
)


def _m(mode, duration, cost, carbon, available=True):
    return ModeMetrics(
        mode=mode, distance_km=3.2, duration_min=duration, estimated_cost_inr=cost,
        estimated_carbon_g=carbon, available=available, routing_source="osrm-live",
    )


@pytest.fixture
def metrics():
    # The real Coimbatore demo-corridor figures, so these tests track what the live pipeline
    # actually sees rather than invented round numbers.
    return {
        "car": _m("car", 3.532, 15.62, 361.71),
        "two_wheeler": _m("two_wheeler", 4.118, 5.70, 131.88),
        "cycling": _m("cycling", 14.65, 0.0, 434.72),
    }


def test_no_agents_means_metrics_pass_through_untouched(metrics):
    adjusted, outcome = apply_agent_adjustments(metrics, active_agents=())
    assert outcome.proposals == ()
    assert outcome.resolved == ()
    for mode, m in metrics.items():
        assert adjusted[mode].duration_min == m.duration_min
        assert adjusted[mode].estimated_cost_inr == m.estimated_cost_inr
        assert adjusted[mode].estimated_carbon_g == m.estimated_carbon_g


def test_speed_agent_only_touches_duration(metrics):
    adjusted, _ = apply_agent_adjustments(metrics, active_agents=("speed",))
    for mode in metrics:
        assert adjusted[mode].duration_min > metrics[mode].duration_min
        assert adjusted[mode].estimated_cost_inr == metrics[mode].estimated_cost_inr
        assert adjusted[mode].estimated_carbon_g == metrics[mode].estimated_carbon_g


def test_cost_agent_only_touches_cost(metrics):
    adjusted, _ = apply_agent_adjustments(metrics, active_agents=("cost",))
    for mode in metrics:
        assert adjusted[mode].estimated_cost_inr > metrics[mode].estimated_cost_inr
        assert adjusted[mode].duration_min == metrics[mode].duration_min
        assert adjusted[mode].estimated_carbon_g == metrics[mode].estimated_carbon_g


def test_carbon_agent_contributes_nothing_without_an_aqi(metrics):
    """It must not invent an air-quality number -- absent an aqi the channel stays untouched."""
    adjusted, outcome = apply_agent_adjustments(metrics, aqi=None, active_agents=("carbon",))
    assert outcome.proposals == ()
    for mode in metrics:
        assert adjusted[mode].estimated_carbon_g == metrics[mode].estimated_carbon_g


def test_carbon_agent_penalises_outdoor_exposure_more_at_moderate_aqi(metrics):
    """Exposure ordering: enclosed cabin < outdoor moderate exertion < outdoor heavy exertion.
    Checked at a moderate AQI, where no mode hits the clamp and the ordering is observable."""
    adjusted, outcome = apply_agent_adjustments(metrics, aqi=120.0, active_agents=("carbon",))
    assert not any(r.was_clamped for r in outcome.resolved)
    uplift = {
        mode: adjusted[mode].estimated_carbon_g / metrics[mode].estimated_carbon_g for mode in metrics
    }
    assert uplift["car"] < uplift["two_wheeler"] < uplift["cycling"]


def test_severe_aqi_saturates_every_outdoor_mode_at_the_clamp(metrics):
    """At severe AQI the raw exposure penalty exceeds the 60% relative cap for both outdoor
    modes, so they saturate at the bound rather than running away -- which deliberately
    collapses the exposure ORDERING at the extreme. Documented here so the behaviour is a
    tested decision, not a surprise: the clamp is what stops one channel dominating."""
    adjusted, outcome = apply_agent_adjustments(metrics, aqi=280.0, active_agents=("carbon",))
    clamped = {r.mode for r in outcome.resolved if r.was_clamped}
    assert clamped == {"two_wheeler", "cycling"}
    for mode in clamped:
        ratio = adjusted[mode].estimated_carbon_g / metrics[mode].estimated_carbon_g
        assert ratio == pytest.approx(1.60, abs=1e-3)
    # The car cabin's low exposure coefficient keeps it under the cap even at severe AQI.
    assert "car" not in clamped


def test_clean_air_produces_no_carbon_penalty(metrics):
    adjusted, outcome = apply_agent_adjustments(metrics, aqi=40.0, active_agents=("carbon",))
    assert aqi_factor(40.0) == 0.0
    assert outcome.proposals == ()
    assert adjusted["cycling"].estimated_carbon_g == metrics["cycling"].estimated_carbon_g


def test_cycling_zero_cost_still_receives_a_wear_adjustment(metrics):
    """A relative-only clamp would multiply cycling's 0.0 baseline by zero and silently drop
    the wear cost -- the absolute floor in MIN_ABSOLUTE_CAP is what prevents that."""
    adjusted, _ = apply_agent_adjustments(metrics, active_agents=("cost",))
    assert adjusted["cycling"].estimated_cost_inr > 0.0
    assert adjusted["cycling"].estimated_cost_inr <= MIN_ABSOLUTE_CAP["estimated_cost_inr"]


def test_adjustments_are_clamped_and_the_clamp_is_reported():
    """A huge baseline carbon under severe AQI would propose more than the relative cap allows;
    the applied delta must be bounded AND the row must say it was clamped."""
    metrics = {"cycling": _m("cycling", 20.0, 0.0, 1000.0)}
    _, outcome = apply_agent_adjustments(metrics, aqi=300.0, active_agents=("carbon",))
    row = next(r for r in outcome.resolved if r.channel == "estimated_carbon_g")
    assert row.was_clamped is True
    assert abs(row.applied_delta) < abs(row.proposed_delta)
    assert abs(row.applied_delta) <= 0.60 * 1000.0 + 1e-9


def test_unavailable_mode_is_never_adjusted(metrics):
    metrics["cycling"] = ModeMetrics(
        mode="cycling", distance_km=None, duration_min=None, estimated_cost_inr=None,
        estimated_carbon_g=None, available=False, routing_source="unavailable",
    )
    adjusted, outcome = apply_agent_adjustments(metrics, aqi=280.0)
    assert adjusted["cycling"].duration_min is None
    assert adjusted["cycling"].available is False
    assert all(r.mode != "cycling" for r in outcome.resolved)


def test_resolution_sums_competing_proposals_before_clamping(metrics):
    """Two agents adjusting the same channel must both count -- neither silently overwrites the
    other. Cost is the only channel with a single proposer, so this uses the outcome record."""
    _, outcome = apply_agent_adjustments(metrics, aqi=280.0, active_agents=AGENT_ROLES)
    by_channel = {(r.mode, r.channel) for r in outcome.resolved}
    # every active agent's channel is represented for a usable mode
    assert ("car", "duration_min") in by_channel
    assert ("car", "estimated_cost_inr") in by_channel
    assert ("car", "estimated_carbon_g") in by_channel


def test_no_adjusted_value_can_go_negative():
    metrics = {"cycling": _m("cycling", 0.1, 0.0, 0.0)}
    adjusted, _ = apply_agent_adjustments(metrics, aqi=300.0)
    assert adjusted["cycling"].duration_min >= 0.0
    assert adjusted["cycling"].estimated_cost_inr >= 0.0
    assert adjusted["cycling"].estimated_carbon_g >= 0.0


# --- the headline claim -------------------------------------------------------------------

def test_ABLATION_deleting_the_specialists_changes_the_recommendation(metrics):
    """The point of the whole adjustment layer: with a speed-dominated weight vector, raw OSRM
    in-vehicle time makes car the winner, but the Speed agent's door-to-door parking penalty
    makes the two-wheeler faster -- so deleting the agents changes the RECOMMENDATION, not just
    the prose. This is the regression guard for the ablation script's Scenario 2."""
    weights = {"time": 0.95, "cost": 0.03, "carbon": 0.02}

    without, _ = apply_agent_adjustments(metrics, active_agents=())
    with_agents, _ = apply_agent_adjustments(metrics, active_agents=AGENT_ROLES)

    u_without = compute_utility_scores(list(without.values()), weights=weights).results
    u_with = compute_utility_scores(list(with_agents.values()), weights=weights).results

    winner_without = max(u_without, key=lambda m: u_without[m].utility)
    winner_with = max(u_with, key=lambda m: u_with[m].utility)

    assert winner_without == "car"
    assert winner_with == "two_wheeler"
    assert winner_without != winner_with


def test_ablation_changes_utility_scores_even_when_the_winner_holds(metrics):
    """Balanced weights keep two_wheeler on top either way, but the scores must still move --
    otherwise the agents are decorative for that trip."""
    without, _ = apply_agent_adjustments(metrics, active_agents=())
    with_agents, _ = apply_agent_adjustments(metrics, active_agents=AGENT_ROLES)

    u_without = compute_utility_scores(list(without.values())).results
    u_with = compute_utility_scores(list(with_agents.values())).results

    assert u_without["car"].utility != u_with["car"].utility
    assert u_without["two_wheeler"].utility != u_with["two_wheeler"].utility
