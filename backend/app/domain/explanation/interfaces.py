"""
domain/explanation/interfaces.py

ExplanationProvider port (Part K: "do not couple the domain to Groq"). Two concrete adapters
exist in infrastructure/llm/: GroqExplanationProvider and DeterministicFallbackExplanationProvider.
Also holds the structured-output validator (Part H) -- pure logic, belongs in the domain layer
because it encodes a business rule ("never let unsupported numbers through"), not an
infrastructure concern.
"""

from __future__ import annotations

from typing import Protocol

from app.domain.explanation.entities import ExplanationContext, ExplanationOutput, extract_numbers


class ExplanationProvider(Protocol):
    async def generate_explanation(self, context: ExplanationContext) -> ExplanationOutput:
        """Raises ExplanationProviderFailureError on any failure -- callers (the use case)
        decide whether to fall back, this method must never itself fall back silently."""
        ...


class UnsupportedNumberError(Exception):
    """Raised by validate_output when the provider's text contains a number not traceable to
    the context it was given -- Part H: 'reject the response, do not silently accept
    hallucinated metrics'."""

    def __init__(self, unsupported: set[str]):
        self.unsupported = unsupported
        super().__init__(f"explanation references unsupported number(s): {sorted(unsupported)}")


def validate_output(context: ExplanationContext, output: ExplanationOutput) -> None:
    """Raises UnsupportedNumberError if any number in summary/reason isn't traceable to a
    number the context actually carried. Raises ValueError if the echoed decision doesn't
    match -- the LLM is never allowed to imply a different decision than what was computed."""
    if output.decision != context.decision:
        raise ValueError(
            f"explanation echoed decision={output.decision!r} but the computed decision was "
            f"{context.decision!r} -- an explanation provider must never alter the decision"
        )

    allowed = context.referenced_numbers()
    found = extract_numbers(output.summary) | extract_numbers(output.reason)
    unsupported = found - allowed
    if unsupported:
        raise UnsupportedNumberError(unsupported)
