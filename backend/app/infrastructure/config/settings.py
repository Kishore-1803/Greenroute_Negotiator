"""
infrastructure/config/settings.py

The ONE place environment variables are read (Part M: "Do not scatter os.getenv() throughout
the codebase"). A single frozen dataclass, loaded once at import time via get_settings()
(process-wide singleton through functools.lru_cache -- cheap, no framework needed for this).

No secrets in source control: see .env.example at the repo root for the variable names this
expects. A real .env is loaded via python-dotenv if present, but is never read by anything
other than this module.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    environment: str
    log_level: str

    google_maps_api_key: str | None

    groq_api_key: str | None
    groq_model_explanation: str
    groq_model_negotiation: str

    default_origin: tuple[float, float]
    default_destination: tuple[float, float]

    preference_db_path: str
    # Default preserves compatibility with lightweight Settings instances in tests and tools.
    cors_allow_origins: list[str] = field(
        default_factory=lambda: ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174"]
    )


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
        groq_api_key=os.getenv("GROQ_API_KEY") or None,
        groq_model_explanation=os.getenv("GROQ_MODEL_EXPLANATION", "llama-3.3-70b-versatile"),
        groq_model_negotiation=os.getenv("GROQ_MODEL_NEGOTIATION", "llama-3.3-70b-versatile"),
        default_origin=(
            float(os.getenv("DEFAULT_ORIGIN_LON", "76.9605")),
            float(os.getenv("DEFAULT_ORIGIN_LAT", "10.9955")),
        ),
        default_destination=(
            float(os.getenv("DEFAULT_DEST_LON", "76.9735")),
            float(os.getenv("DEFAULT_DEST_LAT", "11.0070")),
        ),
        preference_db_path=os.getenv("PREFERENCE_DB_PATH", "greenroute_preferences.db"),
    )
