"""
Shared fixtures for API-level tests. Overrides the use-case dependency factories with fakes
backed by in-memory data (no live OSRM, no live Groq, a tmp-path SQLite file) so these tests
exercise real FastAPI request handling, real Pydantic validation, and the real domain
ValidationError -> HTTP 400 mapping, without needing any external service running.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import (
    get_evaluate_baseline_use_case,
    get_explain_decision_use_case,
    get_record_selection_use_case,
    get_run_negotiation_use_case,
    get_trigger_condition_change_use_case,
)
from app.application.services.trip_store import InMemoryTripStore
from app.application.use_cases.evaluate_baseline import EvaluateBaselineUseCase
from app.application.use_cases.explain_decision import ExplainDecisionUseCase
from app.application.use_cases.record_selection import RecordSelectionUseCase
from app.application.use_cases.run_negotiation import RunNegotiationUseCase
from app.application.use_cases.trigger_condition_change import TriggerConditionChangeUseCase
from app.domain.common.errors import ExplanationProviderFailureError, NegotiationProviderFailureError
from app.domain.routing.entities import RouteMetrics
from app.infrastructure.enrichment.static_factors import StaticCostCarbonProvider
from app.infrastructure.llm.fallback import DeterministicFallbackExplanationProvider
from app.infrastructure.llm.negotiation_fallback import DeterministicNegotiationFallbackProvider
from app.infrastructure.preference.sqlite_store import SQLitePreferenceStore
from app.main import app


class _FakeRoutingProvider:
    """Deterministic, non-network stand-in for OSRMRoutingProvider -- three plausible, distinct
    routes so downstream utility/switch logic has real differentiation to work with."""

    async def route_all_modes(self, origin, destination):
        return {
            "car": RouteMetrics(mode="car", distance_km=3.0, duration_min=8.0),
            "two_wheeler": RouteMetrics(mode="two_wheeler", distance_km=3.0, duration_min=9.0),
            "cycling": RouteMetrics(mode="cycling", distance_km=3.2, duration_min=15.0),
        }


class _FakeTrafficSimulator:
    """Non-network stand-in for OSRMTrafficSimulator -- a fixed, worse car route (never touches
    Docker/OSRM), enough for TriggerConditionChangeUseCase's orchestration to be exercised over
    real HTTP without a live OSRM/Docker environment."""

    async def apply_condition_change(self, mode, origin, destination):
        return RouteMetrics(mode="car", distance_km=3.0, duration_min=20.0), {"simulated": True}


class _AlwaysFailingProvider:
    """Stand-in primary (Groq) provider that always raises, forcing every negotiation/
    explanation call through the deterministic fallback path -- used to test that failure mode
    over real HTTP without needing a real (or absent) Groq API key."""

    async def run_negotiation(self, context):
        raise NegotiationProviderFailureError("simulated Groq negotiation failure")

    async def generate_explanation(self, context):
        raise ExplanationProviderFailureError("simulated Groq explanation failure")


@pytest.fixture
def trip_store():
    return InMemoryTripStore()


@pytest.fixture
def preference_store(tmp_path):
    return SQLitePreferenceStore(tmp_path / "test_preferences.db")


@pytest.fixture
def client(trip_store, preference_store):
    app.dependency_overrides[get_evaluate_baseline_use_case] = lambda: EvaluateBaselineUseCase(
        _FakeRoutingProvider(), StaticCostCarbonProvider(), trip_store, preference_store
    )
    app.dependency_overrides[get_record_selection_use_case] = lambda: RecordSelectionUseCase(preference_store, trip_store)
    app.dependency_overrides[get_trigger_condition_change_use_case] = lambda: TriggerConditionChangeUseCase(
        _FakeTrafficSimulator(), StaticCostCarbonProvider(), trip_store
    )
    # Negotiation/explanation always exercise the deterministic fallback path in these HTTP
    # tests -- no live Groq key is available in CI/test, and that fallback IS the code path
    # every real demo run without GROQ_API_KEY set actually takes (app/api/dependencies.py's
    # _UnconfiguredNegotiationProvider/_UnconfiguredExplanationProvider do the same thing).
    app.dependency_overrides[get_run_negotiation_use_case] = lambda: RunNegotiationUseCase(
        _AlwaysFailingProvider(), DeterministicNegotiationFallbackProvider(), trip_store
    )
    app.dependency_overrides[get_explain_decision_use_case] = lambda: ExplainDecisionUseCase(
        _AlwaysFailingProvider(), DeterministicFallbackExplanationProvider(), trip_store
    )
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
