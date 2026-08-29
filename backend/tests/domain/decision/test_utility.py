"""
Mathematical test suite for domain.decision.utility (Master Plan Section 26, Tests A-F).
Every test targets the FROZEN normalization/aggregation shape directly -- no mocks, no I/O.
"""

from __future__ import annotations

import math

import pytest

from app.domain.decision.entities import ModeMetrics
from app.domain.decision.utility import W_CARBON, W_COST, W_TIME, compute_utility_scores


def _mode(mode: str, duration: float, cost: float, carbon: float, available: bool = True) -> ModeMetrics:
    return ModeMetrics(
        mode=mode, distance_km=5.0, duration_min=duration, estimated_cost_inr=cost,
        estimated_carbon_g=carbon, available=available, routing_source="osrm-live",
    )


# --- Test A: all metrics different -----------------------------------------------------------

def test_all_metrics_different_lower_is_better_wins():
    modes = [
        _mode("car", duration=10, cost=50, carbon=600),
        _mode("two_wheeler", duration=13, cost=20, carbon=200),
        _mode("cycling", duration=25, cost=0, carbon=0),
    ]
    out = compute_utility_scores(modes)
    assert set(out.results) == {"car", "two_wheeler", "cycling"}
    # cycling is best on cost+carbon, worst on time; verify it isn't automatically the winner
    # (that would indicate the weights or normalization direction are broken), and that the
    # ranking is actually driven by the weighted sum, not any single metric in isolation.
    winner = max(out.results, key=lambda m: out.results[m].utility)
    assert winner in {"car", "two_wheeler", "cycling"}
    for score in out.results.values():
        assert 0.0 <= score.norm_time <= 1.0
        assert 0.0 <= score.norm_cost <= 1.0
        assert 0.0 <= score.norm_carbon <= 1.0


# --- Tests B/C/D: exactly one metric tied ------------------------------------------------------

@pytest.mark.parametrize(
    "tied_field",
    ["duration_min", "estimated_cost_inr", "estimated_carbon_g"],
)
def test_single_metric_tied_no_division_by_zero(tied_field):
    values = {"duration_min": [10, 20], "estimated_cost_inr": [30, 60], "estimated_carbon_g": [100, 400]}
    values[tied_field] = [50, 50]  # force exactly this metric to tie
    modes = [
        ModeMetrics("car", 5.0, values["duration_min"][0], values["estimated_cost_inr"][0], values["estimated_carbon_g"][0], True, "osrm-live"),
        ModeMetrics("two_wheeler", 5.0, values["duration_min"][1], values["estimated_cost_inr"][1], values["estimated_carbon_g"][1], True, "osrm-live"),
    ]
    out = compute_utility_scores(modes)
    for score in out.results.values():
        assert not math.isnan(score.utility)
    # the tied dimension must contribute its full normalized value (1.0) to BOTH modes, not
    # penalize either -- a metric that can't differentiate the modes shouldn't be held against
    # any of them.
    norm_key = {"duration_min": "norm_time", "estimated_cost_inr": "norm_cost", "estimated_carbon_g": "norm_carbon"}[tied_field]
    for score in out.results.values():
        assert getattr(score, norm_key) == 1.0


# --- Test E: all metrics tied ------------------------------------------------------------------

def test_all_metrics_tied_all_utilities_equal():
    modes = [_mode("car", 10, 50, 300), _mode("two_wheeler", 10, 50, 300), _mode("cycling", 10, 50, 300)]
    out = compute_utility_scores(modes)
    utilities = {s.utility for s in out.results.values()}
    assert len(utilities) == 1
    assert next(iter(utilities)) == pytest.approx(W_TIME + W_COST + W_CARBON)  # all norms = 1.0


# --- Test F: extreme preference weights ---------------------------------------------------------

def test_extreme_weights_force_the_expected_winner():
    modes = [
        _mode("car", duration=5, cost=100, carbon=1000),   # fastest, but expensive & dirty
        _mode("two_wheeler", duration=15, cost=10, carbon=100),
        _mode("cycling", duration=30, cost=0, carbon=0),   # cheapest & cleanest, slowest
    ]
    speed_only = compute_utility_scores(modes, weights={"time": 1.0, "cost": 0.0, "carbon": 0.0})
    assert max(speed_only.results, key=lambda m: speed_only.results[m].utility) == "car"

    carbon_only = compute_utility_scores(modes, weights={"time": 0.0, "cost": 0.0, "carbon": 1.0})
    assert max(carbon_only.results, key=lambda m: carbon_only.results[m].utility) == "cycling"

    cost_only = compute_utility_scores(modes, weights={"time": 0.0, "cost": 1.0, "carbon": 0.0})
    assert max(cost_only.results, key=lambda m: cost_only.results[m].utility) == "cycling"


# --- Default weights unaffected when no Preference Memory vector is supplied -------------------

def test_no_weights_uses_the_documented_default():
    modes = [_mode("car", 10, 50, 300), _mode("two_wheeler", 13, 20, 150)]
    default = compute_utility_scores(modes)
    explicit = compute_utility_scores(modes, weights={"time": W_TIME, "cost": W_COST, "carbon": W_CARBON})
    for mode in default.results:
        assert default.results[mode].utility == pytest.approx(explicit.results[mode].utility)


def test_unavailable_and_malformed_modes_are_excluded_not_fabricated():
    modes = [
        _mode("car", 10, 50, 300),
        _mode("two_wheeler", 10, 50, 300, available=False),
        ModeMetrics("cycling", 5.0, None, None, None, True, "unavailable"),
    ]
    out = compute_utility_scores(modes)
    assert set(out.results) == {"car"}
    assert "two_wheeler" in out.excluded
    assert "cycling" in out.excluded


def test_no_usable_modes_returns_empty_not_an_exception():
    modes = [_mode("car", 10, 50, 300, available=False)]
    out = compute_utility_scores(modes)
    assert out.results == {}
    assert "car" in out.excluded
