"""
Internal debug routes must 404 outside development (Master Plan implicit hardening
expectation -- these can trigger a real Docker/OSRM surge simulation and must not be reachable
in a deployed environment, include_in_schema=False alone is not access control).
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.infrastructure.config.settings import Settings, get_settings
from app.main import app


import dataclasses

def _settings_with_env(environment: str) -> Settings:
    base = get_settings()
    return dataclasses.replace(base, environment=environment)


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
