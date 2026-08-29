"""
Internal debug routes must 404 outside development (Master Plan implicit hardening
expectation -- these can trigger a real Docker/OSRM surge simulation and must not be reachable
in a deployed environment, include_in_schema=False alone is not access control).
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.infrastructure.config.settings import Settings, get_settings
from app.main import app


def _settings_with_env(environment: str) -> Settings:
    base = get_settings()
    return Settings(
        environment=environment,
        log_level=base.log_level,
        google_maps_api_key=base.google_maps_api_key,
        osrm_host=base.osrm_host,
        osrm_endpoints=base.osrm_endpoints,
        osrm_request_timeout_s=base.osrm_request_timeout_s,
        osrm_customize_timeout_s=base.osrm_customize_timeout_s,
        osrm_container_ready_timeout_s=base.osrm_container_ready_timeout_s,
        groq_api_key=base.groq_api_key,
        groq_model_explanation=base.groq_model_explanation,
        groq_model_negotiation=base.groq_model_negotiation,
        elevenlabs_api_key=base.elevenlabs_api_key,
        elevenlabs_voice_id=base.elevenlabs_voice_id,
        elevenlabs_model=base.elevenlabs_model,
        elevenlabs_request_timeout_s=base.elevenlabs_request_timeout_s,
        default_origin=base.default_origin,
        default_destination=base.default_destination,
        preference_db_path=base.preference_db_path,
    )


def test_internal_routing_test_404s_outside_development():
    app.dependency_overrides[get_settings] = lambda: _settings_with_env("production")
    try:
        with TestClient(app) as client:
            response = client.get("/internal/routing-test")
            assert response.status_code == 404
    finally:
        app.dependency_overrides.clear()


def test_internal_routing_test_surge_404s_outside_development():
    app.dependency_overrides[get_settings] = lambda: _settings_with_env("production")
    try:
        with TestClient(app) as client:
            response = client.post("/internal/routing-test/surge")
            assert response.status_code == 404
    finally:
        app.dependency_overrides.clear()
