"""
infrastructure/speech/elevenlabs_client.py

ElevenLabsSpeechProvider -- the one concrete implementation of domain.speech.interfaces.
SpeechProvider. Calls ElevenLabs' text-to-speech REST endpoint directly with httpx (the same
HTTP client the OSRM adapter uses) rather than pulling in the elevenlabs SDK -- one POST, one
audio/mpeg body back, nothing the SDK would simplify.

This adapter's ONLY job is turning text into MP3 bytes or a domain error. It does not decide
whether the feature is enabled (that's the composition root's job, via api/dependencies.py's
_UnconfiguredSpeechProvider stand-in) and it does not cache (that's NarrateTextUseCase's job).
"""

from __future__ import annotations

import logging

import httpx

from app.domain.common.errors import SpeechProviderFailureError
from app.domain.speech.entities import Narration
from app.infrastructure.config.settings import Settings

logger = logging.getLogger(__name__)

_TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"


class ElevenLabsSpeechProvider:
    def __init__(self, settings: Settings):
        if not settings.elevenlabs_api_key:
            # Guarded so a misconfigured composition root fails loudly here rather than making
            # a doomed call. api/dependencies.py normally substitutes the _Unconfigured stand-in
            # before this constructor is ever reached.
            raise SpeechProviderFailureError("ELEVENLABS_API_KEY is not configured")
        self._api_key = settings.elevenlabs_api_key
        self._voice_id = settings.elevenlabs_voice_id
        self._model = settings.elevenlabs_model
        self._timeout = settings.elevenlabs_request_timeout_s

    @property
    def available(self) -> bool:
        return True

    @property
    def voice_id(self) -> str:
        return self._voice_id

    async def synthesize(self, text: str) -> Narration:
        url = _TTS_URL.format(voice_id=self._voice_id)
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.post(
                    url,
                    headers={
                        "xi-api-key": self._api_key,
                        "accept": "audio/mpeg",
                        "content-type": "application/json",
                    },
                    params={"output_format": "mp3_44100_128"},
                    json={
                        "text": text,
                        "model_id": self._model,
                        "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
                    },
                )
        except httpx.RequestError as exc:
            raise SpeechProviderFailureError(f"could not reach ElevenLabs: {exc}") from exc

        if response.status_code != 200:
            # ElevenLabs returns a JSON error body on failure (quota, bad voice, auth). Log the
            # detail server-side; the client just gets "speech synthesis failed".
            detail = response.text[:300]
            logger.warning("ElevenLabs TTS failed status=%s detail=%s", response.status_code, detail)
            raise SpeechProviderFailureError(
                f"ElevenLabs returned {response.status_code} (see server logs for detail)"
            )

        content_type = response.headers.get("content-type", "")
        if "audio" not in content_type:
            logger.warning("ElevenLabs returned non-audio content-type=%r body=%s", content_type, response.text[:200])
            raise SpeechProviderFailureError(f"ElevenLabs returned a non-audio response ({content_type!r})")

        return Narration(
            audio=response.content,
            media_type="audio/mpeg",
            provider="elevenlabs",
            voice_id=self._voice_id,
            character_count=len(text),
        )
