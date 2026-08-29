"""
app/api/dependencies.py

Composition root: wires infrastructure adapters into the domain interfaces they implement,
and injects them into application use cases. This is the ONLY file that knows every concrete
class exists -- routers depend on use cases, use cases depend on interfaces, nothing else
imports across those boundaries. Singletons via functools.lru_cache (this is a single-process
FastAPI app; no need for a heavier DI container).

Routing is wired to Google Maps (get_raw_routing_provider). The OSRM adapter under
infrastructure/routing/osrm/ is kept in the tree but intentionally NOT imported here -- it is
a drop-in alternative behind the same RoutingProvider port, not the active provider.
"""

from __future__ import annotations

import logging
from functools import lru_cache

from app.application.services.negotiation_log_store import NegotiationLogStore
from app.application.services.trip_store import TripStore
from app.application.use_cases.evaluate_baseline import EvaluateBaselineUseCase
from app.application.use_cases.explain_decision import ExplainDecisionUseCase
from app.application.use_cases.narrate_text import NarrateTextUseCase
from app.application.use_cases.negotiate_journey import NegotiateJourneyUseCase
from app.application.use_cases.record_selection import RecordSelectionUseCase
from app.application.use_cases.run_negotiation import RunNegotiationUseCase
from app.application.use_cases.trigger_condition_change import (
    TriggerConditionChangeUseCase,
)
from app.domain.common.errors import (
    ExplanationProviderFailureError,
    NegotiationProviderFailureError,
    SpeechUnavailableError,
)
from app.domain.explanation.entities import ExplanationContext, ExplanationOutput
from app.domain.negotiation.entities import NegotiationContext, NegotiationTranscript
from app.domain.speech.entities import Narration
from app.infrastructure.config.settings import get_settings
from app.infrastructure.database.session import SessionLocal
from app.infrastructure.enrichment.static_factors import StaticCostCarbonProvider
from app.infrastructure.llm.fallback import DeterministicFallbackExplanationProvider
from app.infrastructure.llm.groq_client import GroqExplanationProvider
from app.infrastructure.llm.negotiation_fallback import (
    DeterministicNegotiationFallbackProvider,
)
from app.infrastructure.llm.negotiation_provider import GroqNegotiationProvider
from app.infrastructure.preference.sqlite_store import SQLitePreferenceStore
from app.infrastructure.routing.cached_fallback import CachedFallbackRoutingProvider
from app.infrastructure.routing.google_maps.client import GoogleMapsRoutingProvider
from app.infrastructure.routing.google_maps.traffic import GoogleMapsTrafficSimulator
from app.infrastructure.speech.elevenlabs_client import ElevenLabsSpeechProvider
from app.infrastructure.storage.sqlite_negotiation_log import SQLiteNegotiationLogStore
from app.infrastructure.storage.sqlite_trip_store import SQLiteTripStore

logger = logging.getLogger(__name__)


class _UnconfiguredExplanationProvider:
    """Stand-in used when GROQ_API_KEY is absent, so the use case's normal
    try-primary/except-fallback path handles "no LLM configured" the same way it handles
    "LLM call failed" -- no special-casing needed at the call site."""

    async def generate_explanation(self, context: ExplanationContext) -> ExplanationOutput:
        raise ExplanationProviderFailureError("no explanation provider configured (GROQ_API_KEY unset)")


class _UnconfiguredNegotiationProvider:
    """Negotiation analogue of _UnconfiguredExplanationProvider above."""

    async def run_negotiation(self, context: NegotiationContext) -> NegotiationTranscript:
        raise NegotiationProviderFailureError("no negotiation provider configured (GROQ_API_KEY unset)")


class _UnconfiguredSpeechProvider:
    """Used when ELEVENLABS_API_KEY is absent. `available` is False so /speech/status tells
    the frontend to hide the listen control; a direct POST to /speech/narrate still gets a
    clean SpeechUnavailableError (-> 503) rather than a stack trace."""

    available = False
    voice_id = ""

    async def synthesize(self, text: str) -> Narration:
        raise SpeechUnavailableError("no speech provider configured (ELEVENLABS_API_KEY unset)")


@lru_cache(maxsize=1)
def get_raw_routing_provider() -> GoogleMapsRoutingProvider:
    return GoogleMapsRoutingProvider(get_settings())


@lru_cache(maxsize=1)
def get_routing_provider() -> CachedFallbackRoutingProvider:
    return CachedFallbackRoutingProvider(get_raw_routing_provider(), get_settings())


@lru_cache(maxsize=1)
def get_traffic_simulator() -> GoogleMapsTrafficSimulator:
    return GoogleMapsTrafficSimulator(get_raw_routing_provider())


@lru_cache(maxsize=1)
def get_enrichment_provider() -> StaticCostCarbonProvider:
    return StaticCostCarbonProvider()


@lru_cache(maxsize=1)
def get_trip_store() -> TripStore:
    return SQLiteTripStore(SessionLocal)

@lru_cache(maxsize=1)
def get_preference_store() -> SQLitePreferenceStore:
    return SQLitePreferenceStore(SessionLocal)

@lru_cache(maxsize=1)
def get_negotiation_log_store() -> NegotiationLogStore:
    return SQLiteNegotiationLogStore(SessionLocal)


@lru_cache(maxsize=1)
def get_primary_explanation_provider():
    settings = get_settings()
    if not settings.groq_api_key:
        logger.warning("GROQ_API_KEY not set -- explanations will always use the deterministic fallback")
        return _UnconfiguredExplanationProvider()
    return GroqExplanationProvider(settings)


@lru_cache(maxsize=1)
def get_fallback_explanation_provider() -> DeterministicFallbackExplanationProvider:
    return DeterministicFallbackExplanationProvider()


@lru_cache(maxsize=1)
def get_primary_negotiation_provider():
    settings = get_settings()
    if not settings.groq_api_key:
        logger.warning("GROQ_API_KEY not set -- negotiation will always use the deterministic fallback")
        return _UnconfiguredNegotiationProvider()
    return GroqNegotiationProvider(settings)


@lru_cache(maxsize=1)
def get_fallback_negotiation_provider() -> DeterministicNegotiationFallbackProvider:
    return DeterministicNegotiationFallbackProvider()


@lru_cache(maxsize=1)
def get_speech_provider():
    settings = get_settings()
    if not settings.elevenlabs_api_key:
        logger.info("ELEVENLABS_API_KEY not set -- voice narration disabled (/speech/* reports it off)")
        return _UnconfiguredSpeechProvider()
    return ElevenLabsSpeechProvider(settings)


@lru_cache(maxsize=1)
def get_narrate_text_use_case() -> NarrateTextUseCase:
    return NarrateTextUseCase(get_speech_provider())


@lru_cache(maxsize=1)
def get_impact_store():
    from app.infrastructure.storage.impact_store import SQLiteImpactStore
    return SQLiteImpactStore(SessionLocal)

@lru_cache(maxsize=1)
def get_user_store():
    from app.infrastructure.storage.user_store import SQLiteUserStore
    return SQLiteUserStore(SessionLocal)


@lru_cache(maxsize=1)
def get_weather_provider():
    from app.infrastructure.weather.weatherstack_client import WeatherProvider
    return WeatherProvider(get_settings().weatherstack_api_key)


def get_evaluate_baseline_use_case() -> EvaluateBaselineUseCase:
    return EvaluateBaselineUseCase(
        get_routing_provider(),
        get_enrichment_provider(),
        get_preference_store(),
        get_trip_store(),
        get_weather_provider(),
    )


@lru_cache(maxsize=1)
def get_embedding_provider():
    from app.infrastructure.memory.embedding_provider import CohereEmbeddingProvider, FallbackEmbeddingProvider
    from app.infrastructure.config.settings import get_settings
    
    settings = get_settings()
    if hasattr(settings, "cohere_api_key") and settings.cohere_api_key:
        return CohereEmbeddingProvider(settings)
    return FallbackEmbeddingProvider()


@lru_cache(maxsize=1)
def get_vector_store():
    from app.infrastructure.memory.actian_store import ActianVectorStore
    return ActianVectorStore()


def get_record_trip_memory_use_case():
    from app.application.use_cases.record_trip_memory import RecordTripMemoryUseCase
    return RecordTripMemoryUseCase(get_embedding_provider(), get_vector_store())


def get_retrieve_trip_memory_use_case():
    from app.application.use_cases.retrieve_trip_memory import RetrieveTripMemoryUseCase
    return RetrieveTripMemoryUseCase(get_embedding_provider(), get_vector_store())


def get_trigger_condition_change_use_case() -> TriggerConditionChangeUseCase:
    return TriggerConditionChangeUseCase(get_traffic_simulator(), get_enrichment_provider(), get_trip_store())


def get_explain_decision_use_case() -> ExplainDecisionUseCase:
    return ExplainDecisionUseCase(get_primary_explanation_provider(), get_fallback_explanation_provider(), get_trip_store())


def get_record_selection_use_case() -> RecordSelectionUseCase:
    return RecordSelectionUseCase(get_preference_store(), get_trip_store(), get_impact_store())


def get_run_negotiation_use_case() -> RunNegotiationUseCase:
    return RunNegotiationUseCase(get_primary_negotiation_provider(), get_fallback_negotiation_provider(), get_trip_store())


def get_negotiate_journey_use_case() -> NegotiateJourneyUseCase:
    return NegotiateJourneyUseCase(
        get_evaluate_baseline_use_case(), get_run_negotiation_use_case(), get_negotiation_log_store()
    )


@lru_cache(maxsize=1)
def get_traveler_negotiation_provider():
    from app.infrastructure.llm.traveler_negotiation import (
        GroqTravelerNegotiationProvider,
    )
    return GroqTravelerNegotiationProvider(get_settings())


def get_find_cooperation_use_case():
    from app.application.use_cases.find_cooperation import FindCooperationUseCase
    return FindCooperationUseCase(get_routing_provider(), get_trip_store(), get_traveler_negotiation_provider())
