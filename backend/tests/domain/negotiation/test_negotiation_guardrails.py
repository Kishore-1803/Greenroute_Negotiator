"""
Test suite for domain.negotiation.interfaces.validate_transcript -- the Coordinator-discipline
guardrail (Master Plan Sections 16 & 27's mandatory adversarial test) plus the specialist
agents' number-grounding rule. No live LLM call: the guardrail is checked as a pure function
against hand-built transcripts, exactly the point of putting it in the domain layer.
"""

from __future__ import annotations

import pytest

from app.domain.negotiation.entities import AgentArgument, CoordinatorNarration, ModeSnapshot, NegotiationContext, NegotiationTranscript
from app.domain.negotiation.interfaces import CoordinatorOverrideError, UnsupportedNumberError, validate_transcript


@pytest.fixture
def context():
    # Deliberately a case where "human intuition" (cycling = greenest = obviously best) and
    # the computed winner diverge -- car is fast/costly, two_wheeler is the actual utility
    # winner, cycling is cleanest per-km but far too slow to win on the weighted formula.
    modes = {
        "car": ModeSnapshot("car", duration_min=10.4, estimated_cost_inr=50.0, estimated_carbon_g=500.0),
        "two_wheeler": ModeSnapshot("two_wheeler", duration_min=13.0, estimated_cost_inr=20.0, estimated_carbon_g=180.0),
        "cycling": ModeSnapshot("cycling", duration_min=40.0, estimated_cost_inr=0.0, estimated_carbon_g=300.0),
    }
    return NegotiationContext(modes=modes, computed_winner="two_wheeler", weights_used={"time": 0.45, "cost": 0.30, "carbon": 0.25})


def _valid_transcript(context, winner="two_wheeler"):
    round_1 = tuple(
        AgentArgument(agent=a, round=1, mode_advocated=context.advocate_for(a), message=f"{context.advocate_for(a)} leads on {a}")
        for a in ("speed", "cost", "carbon")
    )
    round_2 = tuple(
        AgentArgument(agent=a, round=2, mode_advocated=context.advocate_for(a), message="holding position", stance="rebut")
        for a in ("speed", "cost", "carbon")
    )
    return NegotiationTranscript(round_1=round_1, round_2=round_2, coordinator=CoordinatorNarration(winner=winner, summary="ok", provider="groq"))


def test_deterministic_advocate_is_grounded_in_the_real_per_metric_minimum(context):
    assert context.advocate_for("speed") == "car"
    assert context.advocate_for("cost") == "cycling"
    assert context.advocate_for("carbon") == "two_wheeler"


def test_valid_transcript_matching_the_computed_winner_passes(context):
    validate_transcript(context, _valid_transcript(context))  # must not raise


def test_ADVERSARIAL_coordinator_cannot_override_the_computed_winner_with_human_intuition(context):
    """Master Plan Section 27's mandatory test, verbatim: human intuition says cycling should
    win (it's the "greenest-looking" option); the computed winner is two_wheeler. A Coordinator
    that declares "cycling" anyway -- for any reason, however well-argued -- must be rejected."""
    bad = _valid_transcript(context, winner="cycling")
    with pytest.raises(CoordinatorOverrideError) as exc_info:
        validate_transcript(context, bad)
    assert exc_info.value.declared == "cycling"
    assert exc_info.value.computed == "two_wheeler"


def test_agent_cannot_advocate_for_a_mode_other_than_its_data_grounded_position(context):
    bad_round_1 = (
        AgentArgument(agent="speed", round=1, mode_advocated="cycling", message="cycling is fastest"),  # false: car is fastest
    ) + tuple(
        AgentArgument(agent=a, round=1, mode_advocated=context.advocate_for(a), message="ok") for a in ("cost", "carbon")
    )
    transcript = NegotiationTranscript(
        round_1=bad_round_1,
        round_2=_valid_transcript(context).round_2,
        coordinator=CoordinatorNarration(winner="two_wheeler", summary="ok", provider="groq"),
    )
    with pytest.raises(ValueError):
        validate_transcript(context, transcript)


def test_agent_hallucinating_an_unsupported_number_is_rejected(context):
    bad_round_1 = (
        AgentArgument(agent="speed", round=1, mode_advocated="car", message="car takes only 3 minutes, way faster!"),
    ) + tuple(
        AgentArgument(agent=a, round=1, mode_advocated=context.advocate_for(a), message="ok") for a in ("cost", "carbon")
    )
    transcript = NegotiationTranscript(
        round_1=bad_round_1,
        round_2=_valid_transcript(context).round_2,
        coordinator=CoordinatorNarration(winner="two_wheeler", summary="ok", provider="groq"),
    )
    with pytest.raises(UnsupportedNumberError) as exc_info:
        validate_transcript(context, transcript)
    assert "3" in exc_info.value.unsupported


def test_agent_rounding_an_actual_number_is_still_accepted(context):
    # 10.0 rounds to "10" -- the number-grounding check must allow reasonable rounding of a
    # real figure, not just exact string matches (mirrors explanation's extract_numbers rule).
    round_1 = (
        AgentArgument(agent="speed", round=1, mode_advocated="car", message="car takes about 10 minutes"),
    ) + tuple(
        AgentArgument(agent=a, round=1, mode_advocated=context.advocate_for(a), message="ok") for a in ("cost", "carbon")
    )
    transcript = NegotiationTranscript(
        round_1=round_1,
        round_2=_valid_transcript(context).round_2,
        coordinator=CoordinatorNarration(winner="two_wheeler", summary="ok", provider="groq"),
    )
    validate_transcript(context, transcript)  # must not raise
