"""
tests/api/test_network_endpoints.py

HTTP tests for POST /api/v1/network/negotiate -- the one-shot single-traveller, three-mode
utility + negotiation wrapper. Uses the shared `client` fixture (fake routing, deterministic
negotiation fallback, in-memory stores) from conftest.py.
"""

from __future__ import annotations

_PAYLOAD = {
    "origin_lon": 76.9605,
    "origin_lat": 10.9955,
    "dest_lon": 76.9735,
    "dest_lat": 11.0070,
    "user_id": "user_network_test",
    "stated_priority": "balanced",
}


def test_negotiate_returns_scored_modes_and_transcript(client):
    resp = client.post("/api/v1/network/negotiate", json=_PAYLOAD)
    assert resp.status_code == 200, resp.text
    data = resp.json()

    # deterministic utility layer
    assert {m["mode"] for m in data["modes"]} == {"car", "two_wheeler", "cycling"}
    assert set(data["utilities"]) == {"car", "two_wheeler", "cycling"}
    assert data["ranking"][0] == data["computed_winner"]
    assert data["ranking"] == sorted(
        data["ranking"], key=lambda m: data["utilities"][m]["utility"], reverse=True
    )

    # negotiation layer -- narration only
    assert len(data["round_1"]) == 3
    assert len(data["round_2"]) == 3
    assert data["coordinator"]["winner"] == data["computed_winner"]
    assert data["negotiation_provider"] == "deterministic-fallback"

    # audit trail -- one unambiguous cost figure
    assert data["negotiation_id"].startswith("NEG_")
    winner_metrics = next(m for m in data["modes"] if m["mode"] == data["computed_winner"])
    assert data["winning_mode_cost_inr"] == winner_metrics["estimated_cost_inr"]


def test_negotiate_persists_one_log_row(client, negotiation_log_store):
    resp = client.post("/api/v1/network/negotiate", json=_PAYLOAD)
    assert resp.status_code == 200
    assert len(negotiation_log_store.records) == 1

    record = negotiation_log_store.records[0]
    body = resp.json()
    assert record.negotiation_id == body["negotiation_id"]
    assert record.computed_winner == body["computed_winner"]
    assert record.winning_mode_cost_inr == body["winning_mode_cost_inr"]
    assert record.trip_id == body["trip_id"]


def test_negotiate_rejects_out_of_range_coords(client):
    bad = {**_PAYLOAD, "origin_lat": 999.0}
    resp = client.post("/api/v1/network/negotiate", json=bad)
    assert resp.status_code == 422


def test_negotiate_requires_user_id(client):
    bad = {k: v for k, v in _PAYLOAD.items() if k != "user_id"}
    resp = client.post("/api/v1/network/negotiate", json=bad)
    assert resp.status_code == 422


def test_removed_pooling_endpoints_are_gone(client):
    assert client.get("/api/v1/network/active-trips").status_code == 404
    assert client.post("/api/v1/network/confirm-deal", json={}).status_code == 404
