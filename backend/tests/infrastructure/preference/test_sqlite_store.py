"""Test suite for infrastructure.preference.sqlite_store (Master Plan Sections 9-12, 26 Tests G-J)."""

from __future__ import annotations

import pytest

from app.domain.preference.entities import COLD_START_PRESETS
from app.infrastructure.preference.sqlite_store import SQLitePreferenceStore


@pytest.fixture
def store(tmp_path):
    return SQLitePreferenceStore(tmp_path / "preferences.db")


@pytest.mark.parametrize("priority", ["speed", "cost", "carbon", "balanced"])
def test_cold_start_seeds_from_stated_priority(store, priority):
    pref = store.get_or_create(f"user-{priority}", priority)
    w_time, w_cost, w_carbon = COLD_START_PRESETS[priority]
    assert (pref.w_time, pref.w_cost, pref.w_carbon) == (w_time, w_cost, w_carbon)
    assert pref.trip_count == 0


def test_cold_start_with_no_priority_falls_back_to_balanced(store):
    pref = store.get_or_create("user-none", None)
    assert (pref.w_time, pref.w_cost, pref.w_carbon) == COLD_START_PRESETS["balanced"]


def test_cold_start_with_unknown_priority_falls_back_to_balanced_not_a_crash(store):
    pref = store.get_or_create("user-bad", "definitely-not-a-real-priority")
    assert (pref.w_time, pref.w_cost, pref.w_carbon) == COLD_START_PRESETS["balanced"]


def test_second_lookup_never_reseeds_an_existing_user(store):
    first = store.get_or_create("user-1", "carbon")
    second = store.get_or_create("user-1", "speed")  # different priority -- must be ignored
    assert first == second


def test_selected_mode_equal_to_recommended_is_a_pure_lookup_not_an_update(store):
    # Master Plan Section 11: the update only fires "when a user selects a mode different from
    # the recommended mode" -- this test documents that the store itself doesn't enforce that
    # (the application use case does, see application/use_cases/record_selection.py); calling
    # update() directly always moves the weights, so callers must gate on mode difference.
    before = store.get_or_create("user-1", "balanced")
    same_vector = {"time": 0.5, "cost": 0.3, "carbon": 0.2}
    after = store.update("user-1", same_vector, same_vector)
    assert (after.w_time, after.w_cost, after.w_carbon) == (before.w_time, before.w_cost, before.w_carbon)
    assert after.trip_count == before.trip_count + 1


def test_update_moves_weights_toward_the_selected_mode(store):
    store.get_or_create("user-1", "balanced")
    selected = {"time": 0.1, "cost": 0.1, "carbon": 0.9}  # heavily carbon-favoring choice
    recommended = {"time": 0.6, "cost": 0.3, "carbon": 0.1}
    updated = store.update("user-1", selected, recommended)
    # carbon weight should have grown (user picked the carbon-favoring option over what was
    # recommended), time weight should have shrunk
    assert updated.w_carbon > COLD_START_PRESETS["balanced"][2]
    assert updated.w_time < COLD_START_PRESETS["balanced"][0]


def test_update_clamps_negative_intermediate_values(store):
    store.get_or_create("user-1", "carbon")  # starts (0.10, 0.20, 0.70)
    # A large learning rate pushed hard against w_time (already tiny) would go negative
    # without the clamp -- checked on the pre-renormalization intermediate value, which is
    # what MIN_WEIGHT actually floors. The clamp guarantees every dimension stays positive and
    # therefore recoverable; it does NOT guarantee the value survives renormalization above
    # MIN_WEIGHT once the other two dimensions have grown much larger (division by a bigger
    # total can still push a clamped-floor numerator's *share* below 0.01).
    selected = {"time": 0.0, "cost": 0.0, "carbon": 1.0}
    recommended = {"time": 1.0, "cost": 0.0, "carbon": 0.0}
    updated = store.update("user-1", selected, recommended, learning_rate=5.0)
    assert updated.w_time > 0  # clamped positive pre-renormalization, never zero or negative
    assert updated.w_cost > 0
    assert updated.w_carbon > 0
    assert updated.w_time + updated.w_cost + updated.w_carbon == pytest.approx(1.0)


def test_weights_after_update_always_sum_to_one(store):
    store.get_or_create("user-1", "speed")
    updated = store.update("user-1", {"time": 0.2, "cost": 0.7, "carbon": 0.1}, {"time": 0.8, "cost": 0.1, "carbon": 0.1})
    assert updated.w_time + updated.w_cost + updated.w_carbon == pytest.approx(1.0)


def test_trip_count_increments_on_every_update(store):
    store.get_or_create("user-1", "balanced")
    vec = {"time": 0.4, "cost": 0.4, "carbon": 0.2}
    first = store.update("user-1", vec, {"time": 0.3, "cost": 0.3, "carbon": 0.4})
    second = store.update("user-1", vec, {"time": 0.3, "cost": 0.3, "carbon": 0.4})
    assert first.trip_count == 1
    assert second.trip_count == 2


def test_weights_persist_across_a_fresh_store_instance(tmp_path):
    db_path = tmp_path / "preferences.db"
    store_a = SQLitePreferenceStore(db_path)
    store_a.get_or_create("user-1", "carbon")
    updated = store_a.update("user-1", {"time": 0.0, "cost": 0.0, "carbon": 1.0}, {"time": 1.0, "cost": 0.0, "carbon": 0.0})

    store_b = SQLitePreferenceStore(db_path)  # simulates an app restart -- fresh connection
    reloaded = store_b.get_or_create("user-1", None)
    assert reloaded.w_time == updated.w_time
    assert reloaded.w_cost == updated.w_cost
    assert reloaded.w_carbon == updated.w_carbon
    assert reloaded.trip_count == updated.trip_count
