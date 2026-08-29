"""
infrastructure/llm/groq_client.py

GroqExplanationProvider -- one of two implementations of domain.explanation.interfaces.
ExplanationProvider (the other is fallback.py's deterministic template). This adapter's ONLY
responsibility is producing an ExplanationOutput from an ExplanationContext via Groq's
structured tool-calling -- it does NOT validate the output (that's a business rule, applied by
the application use case via domain.explanation.interfaces.validate_output) and it does NOT
decide whether to fall back (that's the use case's orchestration job, per Part K: the
application layer depends on the ExplanationProvider interface, not on any one provider).
"""

from __future__ import annotations

import json
import logging

from groq import AsyncGroq

from app.domain.common.errors import ExplanationProviderFailureError
from app.domain.explanation.entities import ExplanationContext, ExplanationOutput
from app.infrastructure.config.settings import Settings
from app.infrastructure.llm.prompts import SYSTEM_PROMPT, TOOL_SCHEMA, build_user_prompt

logger = logging.getLogger(__name__)


class GroqExplanationProvider:
    def __init__(self, settings: Settings):
        if not settings.groq_api_key:
            raise ExplanationProviderFailureError("GROQ_API_KEY is not configured")
        self._client = AsyncGroq(api_key=settings.groq_api_key)
        self._model = settings.groq_model_explanation

    async def generate_explanation(self, context: ExplanationContext) -> ExplanationOutput:
        try:
            response = await self._client.chat.completions.create(
                model=self._model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": build_user_prompt(context)},
                ],
                tools=[TOOL_SCHEMA],
                tool_choice={"type": "function", "function": {"name": "submit_explanation"}},
                temperature=0.1,
            )
            args = json.loads(response.choices[0].message.tool_calls[0].function.arguments)
        except Exception as exc:  # Groq/network/parsing failures all become one domain error;
            # the use case decides what to do next, this adapter's job ends at "it failed".
            raise ExplanationProviderFailureError(f"Groq explanation call failed: {exc}") from exc

        return ExplanationOutput(
            summary=args["summary"],
            reason=args["reason"],
            decision=args["decision"],
            limitations=tuple(args.get("limitations", [])),
            confidence_note=args.get("confidence_note", ""),
            provider="groq",
        )
