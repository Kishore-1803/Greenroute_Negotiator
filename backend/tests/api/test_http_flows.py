"""
HTTP-level tests for the negotiation, explanation, and condition-change endpoints, plus a
single end-to-end test proving the Master Plan's full primary-flow loop actually works over
real HTTP request/response cycles (not just at the domain-test level). Uses the fake providers
wired in conftest.py -- no live OSRM/Groq/Docker required.
"""

from __future__ import annotations

VALID_BASELINE = {
    "origin_lon": 76.9605,
    "origin_lat": 10.9955,
    "dest_lon": 76.9735,
    "dest_lat": 11.0070,
    "user_id": "http-flow-user",
}


def _baseline(client, **overrides):
    body = dict(VALID_BASELINE, **overrides)
    response = client.post("/api/v1/trips/baseline", json=body)
    assert response.status_code == 200
    return response.json()


def test_negotiation_available_immediately_after_baseline_no_condition_change_needed(client):
    # Master Plan primary flow: negotiation must work on a fresh baseline, without first
    # requiring the advanced condition-change/SWITCH-STAY flow to have run.
    baseline = _baseline(client)
    response = client.post(f"/api/v1/trips/{baseline['trip_id']}/negotiation")
    assert response.status_code == 200
    body = response.json()
    assert {a["agent"] for a in body["round_1"]} == {"speed", "cost", "carbon", "weather"}
    assert {a["agent"] for a in body["round_2"]} == {"speed", "cost", "carbon", "weather"}
    assert body["computed_winner"] == baseline["best_mode"]
    assert body["coordinator"]["winner"] == baseline["best_mode"]


def test_negotiation_round_2_genuinely_differs_from_round_1(client):
    baseline = _baseline(client)
    body = client.post(f"/api/v1/trips/{baseline['trip_id']}/negotiation").json()
    round_1_by_agent = {a["agent"]: a["message"] for a in body["round_1"]}
    round_2_by_agent = {a["agent"]: a["message"] for a in body["round_2"]}
    for agent in ("speed", "cost", "carbon"):
        assert round_1_by_agent[agent] != round_2_by_agent[agent]
    # Round 2 must carry an explicit stance (concede/rebut) that Round 1 never has.
    assert all(a["stance"] is None for a in body["round_1"])
    assert all(a["stance"] in ("concede", "rebut") for a in body["round_2"])


def test_negotiation_falls_back_and_discloses_provider_on_groq_failure(client):
    # conftest.py wires an always-failing primary provider -- this proves the fallback actually
    # runs over real HTTP and that the disclosure field tells the truth about it.
    baseline = _baseline(client)
    body = client.post(f"/api/v1/trips/{baseline['trip_id']}/negotiation").json()
    assert body["coordinator"]["provider"] == "deterministic-fallback"


def test_negotiation_for_unknown_trip_is_404(client):
    response = client.post("/api/v1/trips/does-not-exist/negotiation")
    assert response.status_code == 404


def test_explanation_available_immediately_after_baseline(client):
    # Master Plan Section 18/19: the user must be able to see "why this mode?" for the primary
    # new-trip recommendation without first triggering a condition change.
    baseline = _baseline(client)
    response = client.post(f"/api/v1/trips/{baseline['trip_id']}/explanation", json={})
    assert response.status_code == 200
    body = response.json()
    assert body["decision"] == "RECOMMEND"
    assert baseline["best_mode"] in body["summary"] or baseline["best_mode"].replace("_", "-") in body["summary"]
    assert body["provider"] == "deterministic-fallback"


def test_explanation_objection_category_is_answered(client):
    baseline = _baseline(client)
    response = client.post(
        f"/api/v1/trips/{baseline['trip_id']}/explanation", json={"objection_category": "why_this_mode"}
    )
    assert response.status_code == 200
    assert response.json()["decision"] == "RECOMMEND"


def test_condition_change_produces_switch_or_stay_decision(client):
    baseline = _baseline(client)
    response = client.post(f"/api/v1/trips/{baseline['trip_id']}/condition-change")
    assert response.status_code == 200
    body = response.json()
    assert body["switch_decision"]["decision"] in ("SWITCH", "STAY")
    assert body["traffic_disclosure"]
    assert set(m["mode"] for m in body["after"]["modes"]) == {"car", "two_wheeler", "cycling"}


def test_explanation_after_condition_change_uses_switch_stay_decision(client):
    baseline = _baseline(client)
    condition = client.post(f"/api/v1/trips/{baseline['trip_id']}/condition-change").json()
    response = client.post(f"/api/v1/trips/{baseline['trip_id']}/explanation", json={})
    assert response.status_code == 200
    assert response.json()["decision"] == condition["switch_decision"]["decision"]


def test_full_master_plan_primary_loop_end_to_end(client):
    """Master Plan Section 23: create user -> new trip -> baseline recommendation -> three modes
    calculated -> utility winner -> negotiation -> coordinator -> user selects a mode ->
    preference updated -> second trip -> learned weights loaded. Proven over real HTTP."""
    user_id = "e2e-loop-user"

    # 1-3: new trip, baseline recommendation, three modes calculated
    first = _baseline(client, user_id=user_id, stated_priority="balanced")
    assert set(m["mode"] for m in first["modes"]) == {"car", "two_wheeler", "cycling"}
    assert first["preference"]["trip_count"] == 0

    # 4: utility winner
    winner = first["best_mode"]
    assert winner in first["utilities"]
    assert winner == max(first["utilities"], key=lambda m: first["utilities"][m]["utility"])

    # 5-6: negotiation + coordinator agree with the mathematical winner
    negotiation = client.post(f"/api/v1/trips/{first['trip_id']}/negotiation").json()
    assert negotiation["computed_winner"] == winner
    assert negotiation["coordinator"]["winner"] == winner

    # 7: user selects a DIFFERENT mode than the recommendation
    other_mode = next(m for m in ("car", "two_wheeler", "cycling") if m != winner)
    selection = client.post(f"/api/v1/trips/{first['trip_id']}/selection", json={"selected_mode": other_mode}).json()
    assert selection["recommended_mode"] == winner
    assert selection["weights_changed"] is True

    # 8: preference updated and persisted
    assert selection["preference"]["trip_count"] == 1

    # 9-10: second trip for the SAME user loads the learned (not cold-start) weights
    second = _baseline(client, user_id=user_id)
    assert second["preference"]["trip_count"] == 1
    assert second["preference"]["w_time"] != first["preference"]["w_time"]
    assert second["weights_used"] == {
        "time": second["preference"]["w_time"],
        "cost": second["preference"]["w_cost"],
        "carbon": second["preference"]["w_carbon"],
    }
