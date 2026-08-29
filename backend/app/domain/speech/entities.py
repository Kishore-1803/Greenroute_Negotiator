"""
domain/speech/entities.py

Value objects for the optional text-to-speech narration layer. Deliberately tiny: the narrated
text is always something the rest of the system ALREADY produced and validated (a Coordinator
summary, a grounded explanation) -- speech never introduces a new claim, it only voices an
existing one. So there is nothing here to guard the way domain.negotiation guards a winner.
"""

from __future__ import annotations

from dataclasses import dataclass

# Hard ceiling on a single narration request. The texts this serves (a 2-3 sentence Coordinator
# summary, a short explanation) are well under this; the cap exists so a malformed caller cannot
# spend the whole ElevenLabs character quota in one request.
MAX_NARRATION_CHARS = 1500


@dataclass(frozen=True)
class Narration:
    """The synthesized result. audio is raw MP3 bytes -- the API layer streams it back with
    media_type audio/mpeg; nothing in the domain/application layers inspects the bytes."""

    audio: bytes
    media_type: str  # "audio/mpeg"
    provider: str  # "elevenlabs"
    voice_id: str
    character_count: int
