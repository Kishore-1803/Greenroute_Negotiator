"""
infrastructure/config/settings.py

The ONE place environment variables are read (Part M: "Do not scatter os.getenv() throughout
the codebase"). A single frozen dataclass, loaded once at import time via get_settings()
(process-wide singleton through functools.lru_cache -- cheap, no framework needed for this).

No secrets in source control: see .env.example at the repo root for the variable names this
expects. A real .env is loaded via python-dotenv if present, but is never read by anything
other than this module.

Routing note: Google Maps is the wired provider (google_maps_api_key). The OSRM fields below
(osrm_host / osrm_endpoints / the three osrm_*_timeout_s) exist only so the OSRM adapter under
infrastructure/routing/osrm/ stays constructible -- it is an unwired drop-in alternative behind
the same RoutingProvider port, not read by api/dependencies.py.
"""

from __future__ import annotations

import logging
import os
import secrets
from dataclasses import dataclass, field
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class OSRMEndpoint:
    mode: str
    port: int
    profile_segment: str  # "driving" | "cycling" -- the /route/v1/{profile}/ URL segment
    container_name: str


@dataclass(frozen=True)
class Settings:
    environment: str
    log_level: str

    google_maps_api_key: str | None
    weatherstack_api_key: str | None

    # --- OSRM (unwired alternative provider; see module docstring) ---
    osrm_host: str
    osrm_endpoints: dict[str, OSRMEndpoint]
    osrm_request_timeout_s: float
    osrm_customize_timeout_s: float
    osrm_container_ready_timeout_s: float

    groq_api_key: str | None
    groq_model_explanation: str
    groq_model_negotiation: str

    # HS256 signing key for auth JWTs (see api/auth.py). Never hardcoded in source -- read from
    # JWT_SECRET_KEY if set; otherwise a random key is generated for this process only (logged
    # loudly below), which means tokens issued before a restart stop validating after one. Fine
    # for local/dev use; set JWT_SECRET_KEY explicitly for anything longer-lived than a demo.
    jwt_secret_key: str

    # ElevenLabs text-to-speech (optional). When elevenlabs_api_key is None the /speech/*
    # endpoints report themselves disabled and the frontend hides the "listen" controls --
    # the app never fails to start over a missing voice key.
    elevenlabs_api_key: str | None
    elevenlabs_voice_id: str
    elevenlabs_model: str
    elevenlabs_request_timeout_s: float

    default_origin: tuple[float, float]
    default_destination: tuple[float, float]

    preference_db_path: str
    # Default preserves compatibility with lightweight Settings instances in tests and tools.
    cors_allow_origins: list[str] = field(
        default_factory=lambda: ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174"]
    )


def _resolve_jwt_secret_key() -> str:
    configured = os.getenv("JWT_SECRET_KEY")
    if configured:
        return configured
    logger.warning(
        "JWT_SECRET_KEY not set -- generating a random per-process signing key. "
        "Existing tokens will stop validating on restart. Set JWT_SECRET_KEY in .env "
        "for anything beyond a single local demo session."
    )
    return secrets.token_hex(32)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings(
        environment=os.getenv("GREENROUTE_ENV", "development"),
        log_level=os.getenv("LOG_LEVEL", "INFO"),
        cors_allow_origins=[
            origin.strip()
            for origin in os.getenv(
                "CORS_ALLOW_ORIGINS",
                "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174",
            ).split(",")
            if origin.strip()
        ],
        google_maps_api_key=os.getenv("GOOGLE_MAPS_API_KEY") or None,
        weatherstack_api_key=os.getenv("WEATHERSTACK_API_KEY") or None,
        osrm_host=os.getenv("OSRM_HOST", "http://localhost"),
        osrm_endpoints={
            "car": OSRMEndpoint("car", int(os.getenv("OSRM_PORT_CAR", "5000")), "driving", "greenroute-osrm-car"),
            "two_wheeler": OSRMEndpoint(
                "two_wheeler", int(os.getenv("OSRM_PORT_TWO_WHEELER", "5001")), "driving", "greenroute-osrm-two-wheeler"
            ),
            "cycling": OSRMEndpoint("cycling", int(os.getenv("OSRM_PORT_CYCLING", "5002")), "cycling", "greenroute-osrm-cycle"),
        },
        osrm_request_timeout_s=float(os.getenv("OSRM_REQUEST_TIMEOUT_S", "5.0")),
        osrm_customize_timeout_s=float(os.getenv("OSRM_CUSTOMIZE_TIMEOUT_S", "10.0")),
        osrm_container_ready_timeout_s=float(os.getenv("OSRM_CONTAINER_READY_TIMEOUT_S", "15.0")),
        groq_api_key=os.getenv("GROQ_API_KEY") or None,
        # groq/compound does NOT support forced tool calling (which every LLM call here uses);
        # openai/gpt-oss-20b is a tool-calling-capable default. Override per your Groq account.
        groq_model_explanation=os.getenv("GROQ_MODEL_EXPLANATION", "openai/gpt-oss-20b"),
        groq_model_negotiation=os.getenv("GROQ_MODEL_NEGOTIATION", "openai/gpt-oss-20b"),
        jwt_secret_key=_resolve_jwt_secret_key(),
        elevenlabs_api_key=os.getenv("ELEVENLABS_API_KEY") or None,
        # "River" -- a premade voice usable on the free tier ("Relaxed, Neutral,
        # Informative"). Library/cloned voices need a paid plan; override via env if you have one.
        elevenlabs_voice_id=os.getenv("ELEVENLABS_VOICE_ID", "SAz9YHcvj6GT2YYXdXww"),
        elevenlabs_model=os.getenv("ELEVENLABS_MODEL", "eleven_turbo_v2_5"),
        elevenlabs_request_timeout_s=float(os.getenv("ELEVENLABS_REQUEST_TIMEOUT_S", "20.0")),
        default_origin=(
            float(os.getenv("DEFAULT_ORIGIN_LON", "80.2300")),
            float(os.getenv("DEFAULT_ORIGIN_LAT", "13.0300")),
        ),
        default_destination=(
            float(os.getenv("DEFAULT_DEST_LON", "80.2450")),
            float(os.getenv("DEFAULT_DEST_LAT", "13.0450")),
        ),
        preference_db_path=os.getenv("SQLITE_DB_PATH") or os.getenv("PREFERENCE_DB_PATH", "greenroute_prefs.db"),
    )
