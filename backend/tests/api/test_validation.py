"""
API-boundary validation tests (Master Plan Section 19). Uses the fake in-memory providers from
conftest.py so these run without live OSRM/Groq/network. Covers both Pydantic-level 422s
(malformed request shape) and domain-level 400s (well-formed but semantically invalid input).
"""

from __future__ import annotations

VALID_BASELINE = {
    "origin_lon": 76.9605,
    "origin_lat": 10.9955,
    "dest_lon": 76.9735,
    "dest_lat": 11.0070,
    "current_mode": "car",
    "user_id": "test-user",
}


def test_valid_baseline_request_succeeds(client):
    response = client.post("/api/v1/trips/baseline", json=VALID_BASELINE)
    assert response.status_code == 200
    body = response.json()
    assert body["current_mode"] == "car"
    assert set(m["mode"] for m in body["modes"]) == {"car", "two_wheeler", "cycling"}
    assert body["preference"]["trip_count"] == 0


def test_missing_required_field_is_422(client):
    body = dict(VALID_BASELINE)
    del body["origin_lon"]
    response = client.post("/api/v1/trips/baseline", json=body)
    assert response.status_code == 422


def test_missing_destination_field_is_422(client):
    body = dict(VALID_BASELINE)
    del body["dest_lat"]
    response = client.post("/api/v1/trips/baseline", json=body)
    assert response.status_code == 422


def test_out_of_range_longitude_is_422(client):
    body = dict(VALID_BASELINE, origin_lon=999.0)
    response = client.post("/api/v1/trips/baseline", json=body)
    assert response.status_code == 422


def test_out_of_range_latitude_is_422(client):
    body = dict(VALID_BASELINE, dest_lat=-500.0)
    response = client.post("/api/v1/trips/baseline", json=body)
    assert response.status_code == 422


def test_empty_user_id_is_422(client):
    body = dict(VALID_BASELINE, user_id="")
    response = client.post("/api/v1/trips/baseline", json=body)
    assert response.status_code == 422


def test_invalid_current_mode_is_domain_400(client):
    body = dict(VALID_BASELINE, current_mode="teleport")
    response = client.post("/api/v1/trips/baseline", json=body)
    assert response.status_code == 400
    assert response.json()["error_code"]


def test_invalid_stated_priority_is_domain_400(client):
    body = dict(VALID_BASELINE, stated_priority="fastest-and-cheapest-and-cleanest")
    response = client.post("/api/v1/trips/baseline", json=body)
    assert response.status_code == 400


def test_selection_for_unknown_trip_id_is_404(client):
    response = client.post("/api/v1/trips/does-not-exist/selection", json={"selected_mode": "car"})
    assert response.status_code == 404


def test_selection_with_invalid_mode_is_domain_400(client):
    baseline = client.post("/api/v1/trips/baseline", json=VALID_BASELINE).json()
    response = client.post(f"/api/v1/trips/{baseline['trip_id']}/selection", json={"selected_mode": "hoverboard"})
    assert response.status_code == 400


def test_selection_agreeing_with_recommendation_does_not_change_weights(client):
    # Before any condition-change has been triggered, the trip has no SWITCH/STAY decision yet
    # -- the Master Plan primary-flow "recommendation" is the baseline utility winner
    # (best_mode), NOT whatever current_mode happened to be passed in (that field only matters
    # for the advanced condition-change flow). record_selection.py's _recommended_mode reads
    # trip.best_mode here -- this test pins that contract down.
    baseline = client.post("/api/v1/trips/baseline", json=VALID_BASELINE).json()
    recommended = baseline["best_mode"]
    response = client.post(f"/api/v1/trips/{baseline['trip_id']}/selection", json={"selected_mode": recommended})
    assert response.status_code == 200
    body = response.json()
    assert body["recommended_mode"] == recommended
    assert body["weights_changed"] is False
    assert body["preference"]["w_time"] == baseline["preference"]["w_time"]


def test_selection_differing_from_recommendation_updates_and_persists_weights(client):
    baseline = client.post("/api/v1/trips/baseline", json=VALID_BASELINE).json()
    other_mode = next(m for m in ("car", "two_wheeler", "cycling") if m != baseline["best_mode"])

    response = client.post(f"/api/v1/trips/{baseline['trip_id']}/selection", json={"selected_mode": other_mode})
    assert response.status_code == 200
    body = response.json()
    assert body["weights_changed"] is True
    assert body["preference"]["trip_count"] == 1

    # a second baseline call for the SAME user_id must reflect the updated weights, proving the
    # learning loop actually closes end-to-end (Master Plan Section 12/H)
    second_baseline = client.post("/api/v1/trips/baseline", json=VALID_BASELINE).json()
    assert second_baseline["preference"]["trip_count"] == 1
    assert second_baseline["preference"]["w_time"] != baseline["preference"]["w_time"]


def test_baseline_without_current_mode_uses_best_mode_as_current(client):
    # Master Plan primary flow: current_mode is optional on a brand-new trip. When omitted, the
    # trip's current_mode should default to the computed recommendation, not an arbitrary mode.
    body = {k: v for k, v in VALID_BASELINE.items() if k != "current_mode"}
    body["user_id"] = "no-current-mode-user"
    response = client.post("/api/v1/trips/baseline", json=body)
    assert response.status_code == 200
    data = response.json()
    assert data["current_mode"] == data["best_mode"]


def test_custom_weights_override_stated_priority_and_are_normalized(client):
    # A carbon-only custom weight vector must pick the lowest-carbon mode outright regardless of
    # any stated_priority also supplied in the same request (custom_weights takes precedence).
    # Under the fake routing fixture + real static carbon factors, two_wheeler (41.2 gCO2/km)
    # beats both car (113.0) and cycling (130.0, non-zero food-energy lifecycle emissions --
    # see static_factors.py) -- NOT the naive "cycling always wins on carbon" assumption.
    body = dict(VALID_BASELINE, user_id="custom-weights-user", stated_priority="speed")
    body["custom_weights"] = {"time": 0.0, "cost": 0.0, "carbon": 10.0}  # un-normalized on purpose
    response = client.post("/api/v1/trips/baseline", json=body)
    assert response.status_code == 200
    data = response.json()
    assert data["best_mode"] == "two_wheeler"
    assert data["weights_used"] == {"time": 0.0, "cost": 0.0, "carbon": 1.0}
    # custom_weights must not be persisted into Preference Memory -- the stored/returned
    # `preference` row still reflects the cold-start "speed" preset, not the transient override.
    assert data["preference"]["w_time"] > data["preference"]["w_carbon"]


def test_custom_weights_missing_key_is_domain_400(client):
    body = dict(VALID_BASELINE, custom_weights={"time": 1.0, "cost": 1.0})
    response = client.post("/api/v1/trips/baseline", json=body)
    assert response.status_code == 400


def test_custom_weights_all_zero_is_domain_400(client):
    body = dict(VALID_BASELINE, custom_weights={"time": 0.0, "cost": 0.0, "carbon": 0.0})
    response = client.post("/api/v1/trips/baseline", json=body)
    assert response.status_code == 400
