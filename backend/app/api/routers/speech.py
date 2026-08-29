"""
app/api/routers/speech.py

  GET  /api/v1/speech/status   -- is voice narration configured? (frontend gates its UI on this)
  POST /api/v1/speech/narrate  -- text in, audio/mpeg out

HTTP translation only. The text is expected to be something the backend already produced (a
Coordinator narration, a grounded explanation); this endpoint just voices it via ElevenLabs.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Response

from app.api.dependencies import get_narrate_text_use_case
from app.application.use_cases.narrate_text import NarrateTextUseCase
from app.schemas.requests import NarrateRequest
from app.schemas.responses import SpeechStatusResponse

router = APIRouter(prefix="/api/v1/speech", tags=["speech"])


@router.get("/status", response_model=SpeechStatusResponse)
async def status(
    use_case: NarrateTextUseCase = Depends(get_narrate_text_use_case),
) -> SpeechStatusResponse:
    enabled = use_case.available
    return SpeechStatusResponse(
        enabled=enabled,
        provider="elevenlabs" if enabled else None,
        voice_id=use_case.voice_id if enabled else None,
    )


@router.post(
    "/narrate",
    responses={200: {"content": {"audio/mpeg": {}}, "description": "MP3 narration of the supplied text"}},
)
async def narrate(
    body: NarrateRequest,
    use_case: NarrateTextUseCase = Depends(get_narrate_text_use_case),
) -> Response:
    narration = await use_case.execute(body.text)  # raises ValidationError / SpeechUnavailable / SpeechProviderFailure
    return Response(
        content=narration.audio,
        media_type=narration.media_type,
        headers={
            "X-Speech-Provider": narration.provider,
            "X-Speech-Voice": narration.voice_id,
            "X-Speech-Characters": str(narration.character_count),
            "Cache-Control": "no-store",
        },
    )
