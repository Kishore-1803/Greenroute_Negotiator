"""
infrastructure/llm/negotiation_provider.py

GroqNegotiationProvider -- one of two implementations of domain.negotiation.interfaces.
NegotiationProvider (the other is negotiation_fallback.py's deterministic template). Runs the
Master Plan's 2-round negotiation for real:

    Round 1: three specialist agents (speed/cost/carbon) argue independently, in parallel.
    Round 2: each agent is given the OTHER two agents' Round 1 arguments and must concede or
             rebut -- this is what makes Round 2 genuinely dependent on Round 1's content,
             not three more independent messages that merely look like rebuttals.
    Coordinator: narrates the already-computed winner. Never sees a "pick a winner" prompt --
             only "explain why this one, which is already decided, won."

This adapter's ONLY responsibility is producing a NegotiationTranscript -- it does NOT
validate the output (domain.negotiation.interfaces.validate_transcript, applied by the
application use case) and does NOT decide whether to fall back (the use case's job, Part K).
"""

from __future__ import annotations

import json
import logging

from groq import AsyncGroq

from app.domain.common.errors import NegotiationProviderFailureError
from app.domain.negotiation.entities import (
    AgentArgument,
    CoordinatorNarration,
    NegotiationContext,
    NegotiationTranscript,
)
from app.infrastructure.config.settings import Settings
from app.infrastructure.llm.negotiation_prompts import (
    coordinator_system_prompt,
    coordinator_tool_schema,
    coordinator_user_prompt,
    panel_round_1_system_prompt,
    panel_round_1_user_prompt,
    panel_round_2_system_prompt,
    panel_round_2_user_prompt,
    panel_tool_schema,
)

logger = logging.getLogger(__name__)


class GroqNegotiationProvider:
    def __init__(self, settings: Settings):
        if not settings.groq_api_key:
            raise NegotiationProviderFailureError("GROQ_API_KEY is not configured")
        self._client = AsyncGroq(api_key=settings.groq_api_key)
        self._model = settings.groq_model_negotiation

    async def _panel_call(self, system: str, user: str, round_no: int) -> list[dict]:
        response = await self._client.chat.completions.create(
            model=self._model,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            tools=[panel_tool_schema(round_no)],
            tool_choice={"type": "function", "function": {"name": "submit_arguments"}},
            temperature=0.3,
            max_tokens=2048,
        )
        args = json.loads(response.choices[0].message.tool_calls[0].function.arguments)
        return args.get("arguments", [])

    async def run_negotiation(self, context: NegotiationContext) -> NegotiationTranscript:
        try:
            round_1_raw = await self._panel_call(
                panel_round_1_system_prompt(), 
                panel_round_1_user_prompt(context), 
                1
            )
            round_1 = [
                AgentArgument(
                    agent=raw["agent"], 
                    round=1, 
                    mode_advocated=context.advocate_for(raw["agent"]), 
                    message=raw["message"]
                )
                for raw in round_1_raw
            ]

            round_2_raw = await self._panel_call(
                panel_round_2_system_prompt(),
                panel_round_2_user_prompt(context, round_1),
                2
            )
            round_2 = [
                AgentArgument(
                    agent=raw["agent"],
                    round=2,
                    mode_advocated=context.advocate_for(raw["agent"]),
                    message=raw["message"],
                    stance=raw.get("stance"),
                )
                for raw in round_2_raw
            ]

            coordinator_response = await self._client.chat.completions.create(
                model=self._model,
                messages=[
                    {"role": "system", "content": coordinator_system_prompt()},
                    {"role": "user", "content": coordinator_user_prompt(context, round_1, round_2)},
                ],
                tools=[coordinator_tool_schema(list(context.modes.keys()))],
                tool_choice={"type": "function", "function": {"name": "submit_coordinator_summary"}},
                temperature=0.1,
                max_tokens=1024,
            )
            coordinator_args = json.loads(coordinator_response.choices[0].message.tool_calls[0].function.arguments)
        except Exception as exc:  # Groq/network/parsing failures all become one domain error;
            # the use case decides what to do next, this adapter's job ends at "it failed".
            raise NegotiationProviderFailureError(f"Groq negotiation call failed: {exc}") from exc

        return NegotiationTranscript(
            round_1=tuple(round_1),
            round_2=tuple(round_2),
            coordinator=CoordinatorNarration(
                winner=coordinator_args["winner"], summary=coordinator_args["summary"], provider="groq"
            ),
        )
