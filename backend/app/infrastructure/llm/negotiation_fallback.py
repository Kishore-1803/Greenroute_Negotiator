"""
infrastructure/llm/negotiation_fallback.py

DeterministicNegotiationFallbackProvider -- the second implementation of
domain.negotiation.interfaces.NegotiationProvider. Used when Groq fails or a round's output
fails validation (mirrors infrastructure/llm/fallback.py's role for the explanation path,
Master Plan Section 20's "pre-generated fallback" requirement, updated to build the transcript
from the live trip context rather than a static JSON file -- the deterministic advocate and
number-grounding are already pure functions of the actual metrics, so there is nothing
"pre-generated" left to go stale between demo runs). No network call, no randomness, no LLM.
"""

from __future__ import annotations

from app.domain.negotiation.entities import AGENT_ROLES, AgentArgument, CoordinatorNarration, NegotiationContext, NegotiationTranscript

_METRIC_LABEL = {"speed": "duration_min", "cost": "estimated_cost_inr", "carbon": "estimated_carbon_g"}
_METRIC_UNIT = {"speed": "min", "cost": "INR", "carbon": "g CO2"}


def _metric_value(context: NegotiationContext, mode: str, agent: str) -> float:
    return getattr(context.modes[mode], _METRIC_LABEL[agent])


def _round_1_message(context: NegotiationContext, agent: str) -> str:
    mode = context.advocate_for(agent)
    value = _metric_value(context, mode, agent)
    return f"{mode} leads on {agent}: {value:g} {_METRIC_UNIT[agent]}, the lowest among the modes considered."


def _round_2_message(context: NegotiationContext, agent: str, others: list[AgentArgument]) -> tuple[str, str]:
    mode = context.advocate_for(agent)
    if mode == context.computed_winner:
        stance = "rebut"
        text = (
            f"Holding position: {mode} still leads on {agent} at {_metric_value(context, mode, agent):g} "
            f"{_METRIC_UNIT[agent]}, and it is also the mode the utility formula ultimately selects."
        )
    else:
        stance = "concede"
        winner_value = _metric_value(context, context.computed_winner, agent)
        text = (
            f"Conceding on the overall pick: {mode} still wins on {agent} alone, but {context.computed_winner} "
            f"({winner_value:g} {_METRIC_UNIT[agent]} on this metric) comes out ahead once time, cost, and "
            f"carbon are weighed together."
        )
    return stance, text


class DeterministicNegotiationFallbackProvider:
    async def run_negotiation(self, context: NegotiationContext) -> NegotiationTranscript:
        round_1 = [
            AgentArgument(agent=agent, round=1, mode_advocated=context.advocate_for(agent), message=_round_1_message(context, agent))
            for agent in AGENT_ROLES
        ]
        round_2 = []
        for agent in AGENT_ROLES:
            others = [a for a in round_1 if a.agent != agent]
            stance, text = _round_2_message(context, agent, others)
            round_2.append(
                AgentArgument(agent=agent, round=2, mode_advocated=context.advocate_for(agent), message=text, stance=stance)
            )

        summary = (
            f"After two rounds of argument, the utility formula (weights: {context.weights_used}) selects "
            f"{context.computed_winner} as the best overall balance of time, cost, and carbon."
        )
        return NegotiationTranscript(
            round_1=tuple(round_1),
            round_2=tuple(round_2),
            coordinator=CoordinatorNarration(
                winner=context.computed_winner, summary=summary, provider="deterministic-fallback"
            ),
        )
