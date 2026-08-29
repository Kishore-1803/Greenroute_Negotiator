"""
HTTP-level checks that the specialist-agent adjustment layer is visible in the API response --
BaselineResponse and the /network/negotiate response must carry the raw metrics, the resolved
adjustments, and the aqi so the frontend can render the before/after trail. Domain-level
behaviour of the adjustments themselves is covered by tests/domain/negotiation/test_adjustments.py.
"""

from __future__ import annotations

VALID_BASELINE = {
    "origin_lon": 76.9605, "origin_lat": 10.9955,
    "dest_lon": 76.9735, "dest_lat": 11.0070,
    "user_id": "adj-response-user",
}


def test_baseline_carries_raw_modes_adjustments_and_aqi(client):
    body = client.post("/api/v1/trips/baseline", json={**VALID_BASELINE, "aqi": 180}).json()

    assert body["aqi"] == 180.0
    assert {m["mode"] for m in body["raw_modes"]} == {"car", "two_wheeler", "cycling"}

    adj = body["adjustments"]
    assert adj is not None
    assert set(adj["agents_active"]) >= {"carbon", "cost", "speed"}
    assert len(adj["proposals"]) > 0
    assert len(adj["resolved"]) > 0
    for row in adj["resolved"]:
        assert {"mode", "channel", "proposed_delta", "applied_delta", "was_clamped",
                "baseline_value", "adjusted_value"} <= row.keys()

    # The scored `modes` are the adjusted ones -- they must differ from raw for at least one mode.
    raw = {m["mode"]: m for m in body["raw_modes"]}
    scored = {m["mode"]: m for m in body["modes"]}
    assert any(
        raw[m]["duration_min"] != scored[m]["duration_min"]
        or raw[m]["estimated_cost_inr"] != scored[m]["estimated_cost_inr"]
        or raw[m]["estimated_carbon_g"] != scored[m]["estimated_carbon_g"]
        for m in scored
    )


def test_baseline_without_aqi_still_adjusts_speed_and_cost_but_not_carbon(client):
    body = client.post("/api/v1/trips/baseline", json=VALID_BASELINE).json()
    assert body["aqi"] is None
    channels = {r["channel"] for r in body["adjustments"]["resolved"]}
    assert "duration_min" in channels
    assert "estimated_cost_inr" in channels
    assert "estimated_carbon_g" not in channels  # carbon agent proposes nothing without an aqi


def test_baseline_rejects_negative_aqi(client):
    resp = client.post("/api/v1/trips/baseline", json={**VALID_BASELINE, "aqi": -5})
    assert resp.status_code == 422  # pydantic ge=0


def test_network_negotiate_also_carries_the_adjustment_trail(client):
    body = client.post(
        "/api/v1/network/negotiate",
        json={**VALID_BASELINE, "stated_priority": "balanced", "aqi": 200},
    ).json()
    assert body["aqi"] == 200.0
    assert set(body["adjustments"]["agents_active"]) >= {"speed", "cost", "carbon"}
