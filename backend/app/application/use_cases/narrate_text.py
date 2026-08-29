"""
application/use_cases/narrate_text.py

Orchestration for POST /api/v1/speech/narrate: validate the requested text, ask the
SpeechProvider to synthesize it, and cache the result so replaying the same Coordinator
summary (the common case -- a user clicks "listen" twice) does not spend the ElevenLabs
character quota again.

No business rule lives here beyond the length/emptiness guard: the text being narrated was
already produced and validated elsewhere (a Coordinator narration, a grounded explanation),
so there is nothing for this layer to fact-check.
"""

from __future__ import annotations

import hashlib
import logging
from collections import OrderedDict

from app.domain.common.errors import ValidationError
from app.domain.speech.entities import MAX_NARRATION_CHARS, Narration
from app.domain.speech.interfaces import SpeechProvider

logger = logging.getLogger(__name__)

_CACHE_MAX_ENTRIES = 64


class NarrateTextUseCase:
    def __init__(self, provider: SpeechProvider):
        self._provider = provider
        # Small process-local LRU. Keyed by (voice_id, text) so a voice change (env override +
        # restart) can't serve stale audio. Bytes for a 3-sentence clip are ~30-70 KB, so 64
        # entries is a few MB at worst -- fine for a single-process demo backend.
        self._cache: OrderedDict[str, Narration] = OrderedDict()

    @property
    def available(self) -> bool:
        return self._provider.available

    @property
    def voice_id(self) -> str:
        return self._provider.voice_id

    async def execute(self, text: str) -> Narration:
        cleaned = (text or "").strip()
        if not cleaned:
            raise ValidationError("text to narrate must not be empty")
        if len(cleaned) > MAX_NARRATION_CHARS:
            raise ValidationError(
                f"text to narrate is {len(cleaned)} chars; the limit is {MAX_NARRATION_CHARS}"
            )

        key = hashlib.sha256(f"{self._provider.voice_id}\x00{cleaned}".encode()).hexdigest()
        cached = self._cache.get(key)
        if cached is not None:
            self._cache.move_to_end(key)
            logger.debug("speech cache hit voice=%s chars=%d", self._provider.voice_id, len(cleaned))
            return cached

        narration = await self._provider.synthesize(cleaned)  # raises SpeechUnavailable / SpeechProviderFailure

        self._cache[key] = narration
        self._cache.move_to_end(key)
        while len(self._cache) > _CACHE_MAX_ENTRIES:
            self._cache.popitem(last=False)
        return narration
