"""Test suite for domain.decision.switch_policy's dual-gate SWITCH/STAY rule.

Numbers below are worked out by hand against the actual normalization formula (max-min per
metric across ALL modes being compared, not just current-vs-one-alternative) -- with exactly
two modes being compared, min-max normalization always polarizes the dominant one to exactly
1.0 and the other to exactly 0.0, so the *relative* gate can only be meaningfully exercised
with three or more modes stretching the normalization range. Tests below reflect that.
"""

from __future__ import annotations

from app.domain.decision.entities import ModeMetrics
from app.domain.decision.switch_policy import evaluate_switch
from app.domain.decision.utility import compute_utility_scores


def _mode(mode: str, duration: float, cost: float, carbon: float) -> ModeMetrics:
    return ModeMetrics(mode, 5.0, duration, cost, carbon, True, "osrm-live")


def test_switch_when_both_gates_clear():
    modes = [_mode("car", 20, 80, 700), _mode("two_wheeler", 10, 20, 200)]  # big time+cost+carbon win
    utilities = compute_utility_scores(modes).results
    decision = evaluate_switch("car", {m.mode: m for m in modes}, utilities)
    assert decision.decision == "SWITCH"
    assert decision.recommended_mode == "two_wheeler"
    assert decision.deltas.time_saved_min == 10
    assert decision.deltas.cost_saved_inr == 60
    assert decision.deltas.carbon_saved_g == 500


def test_stay_when_relative_gate_correctly_blocks_a_one_metric_flash_win():
    # two_wheeler is dramatically faster (25 min saved -- clears the absolute gate on time
    # alone) but also far pricier and dirtier than car, so it is actually WORSE overall on the
    # weighted formula. The absolute gate's OR logic would authorize this switch on the time
    # number by itself; the relative utility-advantage gate is what correctly blocks it,
    # demonstrating why the dual-gate design needs both checks, not just the absolute one.
    car = _mode("car", duration=30, cost=20, carbon=100)
    two_wheeler = _mode("two_wheeler", duration=5, cost=500, carbon=900)
    utilities = compute_utility_scores([car, two_wheeler]).results

    advantage = utilities["two_wheeler"].utility - utilities["car"].utility
    assert advantage < 0.15  # relative gate must fail: two_wheeler is worse overall

    decision = evaluate_switch("car", {m.mode: m for m in [car, two_wheeler]}, utilities)
    assert decision.decision == "STAY"


def test_stay_when_absolute_gate_fails_despite_full_relative_advantage():
    # Only two modes -> two_wheeler dominates every metric and is polarized to utility=1.0
    # (relative gate trivially clears), but the real-world deltas are all below every absolute
    # threshold -- must still STAY.
    modes = [_mode("car", 10.5, 50.5, 300.5), _mode("two_wheeler", 10.0, 50.0, 300.0)]
    utilities = compute_utility_scores(modes).results
    advantage = utilities["two_wheeler"].utility - utilities["car"].utility
    assert advantage == 1.0  # confirms the polarization premise this test relies on

    decision = evaluate_switch("car", {m.mode: m for m in modes}, utilities)
    assert decision.decision == "STAY"


def test_current_mode_missing_defaults_to_stay_not_a_crash():
    modes = [_mode("car", 10, 50, 300)]
    utilities = compute_utility_scores(modes).results
    decision = evaluate_switch("cycling", {m.mode: m for m in modes}, utilities)
    assert decision.decision == "STAY"
    assert decision.recommended_mode is None


def test_tie_break_among_near_tied_candidates_prefers_lowest_carbon():
    # two_wheeler is the raw utility-max (0.9947), but cycling is within TIE_EPSILON (0.01) of
    # it AND has meaningfully lower carbon (195g vs 210g) -- the tie-break must promote cycling
    # over the raw argmax, not just report whichever mode happened to score highest.
    car = _mode("car", 30, 100, 900)
    two_wheeler = _mode("two_wheeler", 10, 20, 210)
    cycling = _mode("cycling", 10.5, 20.5, 195)
    modes = {m.mode: m for m in (car, two_wheeler, cycling)}
    utilities = compute_utility_scores([car, two_wheeler, cycling]).results

    gap = utilities["two_wheeler"].utility - utilities["cycling"].utility
    assert 0 < gap <= 0.01  # confirms these two really are within the tie-break epsilon

    decision = evaluate_switch("car", modes, utilities)
    assert decision.decision == "SWITCH"
    assert decision.recommended_mode == "cycling"
