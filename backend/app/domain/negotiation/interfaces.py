"""
domain/negotiation/interfaces.py

NegotiationProvider port + the guardrail validators. Pure logic that belongs in the domain
layer because it encodes business rules -- "an agent may not reference a number outside the
context it was given", "the Coordinator may never declare a winner other than the one the
utility engine computed" -- not an infrastructure concern (Part K).
"""

from __future__ import annotations

from typing import Protocol

from app.domain.negotiation.entities import (
    NegotiationContext,
    NegotiationTranscript,
    extract_numbers,
)


class NegotiationProvider(Protocol):
    async def run_negotiation(self, context: NegotiationContext) -> NegotiationTranscript:
        """Raises NegotiationProviderFailureError on any failure -- callers (the use case)
        decide whether to fall back, this method must never itself fall back silently."""
        ...


class UnsupportedNumberError(Exception):
    def __init__(self, agent: str, unsupported: set[str]):
        self.agent = agent
        self.unsupported = unsupported
        super().__init__(f"{agent} argument references unsupported number(s): {sorted(unsupported)}")


class CoordinatorOverrideError(Exception):
    """Raised when a Coordinator's declared winner does not match the utility-computed winner
    -- the single most important guardrail in the system (Master Plan Section 16: 'the LLM
    must never pick a winner different from the calculated utility score')."""

    def __init__(self, declared: str, computed: str):
        self.declared = declared
        self.computed = computed
        super().__init__(f"coordinator declared winner={declared!r} but the computed winner was {computed!r}")


def validate_transcript(context: NegotiationContext, transcript: NegotiationTranscript) -> None:
    """Raises UnsupportedNumberError if any agent's message contains a number not traceable to
    the context, ValueError if an agent's declared mode_advocated doesn't match the
    data-grounded position for that agent/metric, or CoordinatorOverrideError if the
    Coordinator's winner doesn't exactly match the precomputed utility winner."""
    allowed = context.referenced_numbers()
    for arg in (*transcript.round_1, *transcript.round_2):
        expected_advocate = context.advocate_for(arg.agent)
        if arg.mode_advocated != expected_advocate:
            raise ValueError(
                f"{arg.agent} agent (round {arg.round}) advocated {arg.mode_advocated!r} but the data-grounded "
                f"position for that agent is {expected_advocate!r}"
            )
        unsupported = extract_numbers(arg.message) - allowed
        if unsupported:
            raise UnsupportedNumberError(arg.agent, unsupported)

    if transcript.coordinator.winner != context.computed_winner:
        raise CoordinatorOverrideError(transcript.coordinator.winner, context.computed_winner)
