"""
domain/speech/interfaces.py

SpeechProvider port (Part K: the application layer depends on this Protocol, not on ElevenLabs).
Only one concrete adapter exists today -- infrastructure/speech/elevenlabs_client.py -- plus a
"not configured" stand-in wired in api/dependencies.py, exactly the pattern the explanation and
negotiation providers already use for a missing GROQ_API_KEY.
"""

from __future__ import annotations

from typing import Protocol

from app.domain.speech.entities import Narration


class SpeechProvider(Protocol):
    @property
    def available(self) -> bool:
        """True when this provider is configured and can be called. The /speech/status endpoint
        surfaces this so the frontend can hide the 'listen' control instead of showing a button
        that always errors."""
        ...

    @property
    def voice_id(self) -> str:
        ...

    async def synthesize(self, text: str) -> Narration:
        """Raises SpeechUnavailableError if not configured, SpeechProviderFailureError on any
        upstream/network failure -- never returns silent or fabricated audio."""
        ...
