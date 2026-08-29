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

import asyncio
import json
import logging

from groq import AsyncGroq

from app.domain.common.errors import NegotiationProviderFailureError
from app.domain.negotiation.entities import AGENT_ROLES, AgentArgument, CoordinatorNarration, NegotiationContext, NegotiationTranscript
from app.infrastructure.config.settings import Settings
from app.infrastructure.llm.negotiation_prompts import (
    agent_tool_schema,
    coordinator_system_prompt,
    coordinator_tool_schema,
    coordinator_user_prompt,
    round_1_system_prompt,
    round_1_user_prompt,
    round_2_system_prompt,
    round_2_user_prompt,
)

logger = logging.getLogger(__name__)


class GroqNegotiationProvider:
    def __init__(self, settings: Settings):
        if not settings.groq_api_key:
            raise NegotiationProviderFailureError("GROQ_API_KEY is not configured")
        self._client = AsyncGroq(api_key=settings.groq_api_key)
        self._model = settings.groq_model_negotiation

    async def _agent_call(self, system: str, user: str, round_no: int) -> dict:
        response = await self._client.chat.completions.create(
            model=self._model,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            tools=[agent_tool_schema(round_no)],
            tool_choice={"type": "function", "function": {"name": "submit_argument"}},
            temperature=0.3,
        )
        return json.loads(response.choices[0].message.tool_calls[0].function.arguments)

    async def run_negotiation(self, context: NegotiationContext) -> NegotiationTranscript:
        try:
            round_1_raw = await asyncio.gather(
                *(
                    self._agent_call(round_1_system_prompt(agent), round_1_user_prompt(context, agent), 1)
                    for agent in AGENT_ROLES
                )
            )
            round_1 = [
                AgentArgument(agent=agent, round=1, mode_advocated=context.advocate_for(agent), message=raw["message"])
                for agent, raw in zip(AGENT_ROLES, round_1_raw)
            ]

            round_2_raw = await asyncio.gather(
                *(
                    self._agent_call(
                        round_2_system_prompt(agent),
                        round_2_user_prompt(context, agent, [a for a in round_1 if a.agent != agent]),
                        2,
                    )
                    for agent in AGENT_ROLES
                )
            )
            round_2 = [
                AgentArgument(
                    agent=agent,
                    round=2,
                    mode_advocated=context.advocate_for(agent),
                    message=raw["message"],
                    stance=raw.get("stance"),
                )
                for agent, raw in zip(AGENT_ROLES, round_2_raw)
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
