"""
domain/negotiation/entities.py

Structured input/output for the 2-round negotiation + Coordinator LLM roles (Master Plan
Section 1/3/6: Speed/Cost/Carbon Specialist Agents argue across two rounds, then a Coordinator
narrates -- but never recalculates -- the deterministic utility-score winner).

NegotiationContext carries only already-computed facts, the same discipline
domain.explanation.entities.ExplanationContext already uses: there is no field an LLM could
use to invent a metric or a winner, by construction. Each specialist agent's advocated mode is
derived HERE, deterministically from the raw per-mode metrics, never from the LLM -- so "the
agent must not fabricate a position" is a checkable fact (see interfaces.validate_transcript),
not a prompt-only promise.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

AGENT_ROLES = ("speed", "cost", "carbon")
_METRIC_BY_AGENT = {"speed": "duration_min", "cost": "estimated_cost_inr", "carbon": "estimated_carbon_g"}


@dataclass(frozen=True)
class ModeSnapshot:
    """One mode's facts as handed to the negotiation -- a slim projection of
    domain.decision.entities.ModeMetrics, so this module has no import dependency on the
    decision bounded context (Part E)."""
    mode: str
    duration_min: float
    estimated_cost_inr: float
    estimated_carbon_g: float


def deterministic_advocate(agent: str, modes: dict[str, ModeSnapshot]) -> str:
    metric = _METRIC_BY_AGENT[agent]
    return min(modes, key=lambda m: getattr(modes[m], metric))


@dataclass(frozen=True)
class NegotiationContext:
    modes: dict[str, ModeSnapshot]
    computed_winner: str  # argmax(utility) over `modes` -- the ONLY value any output may declare as the winner
    weights_used: dict[str, float]

    def advocate_for(self, agent: str) -> str:
        return deterministic_advocate(agent, self.modes)

    def referenced_numbers(self) -> set[str]:
        out: set[str] = set()
        for m in self.modes.values():
            for v in (m.duration_min, m.estimated_cost_inr, m.estimated_carbon_g):
                out.add(_normalize_number(v))
                out.add(_normalize_number(round(v)))
        return out


@dataclass(frozen=True)
class AgentArgument:
    agent: str  # "speed" | "cost" | "carbon"
    round: int  # 1 | 2
    mode_advocated: str
    message: str
    stance: str | None = None  # round 2 only: "concede" | "rebut"


@dataclass(frozen=True)
class CoordinatorNarration:
    winner: str  # must echo NegotiationContext.computed_winner exactly
    summary: str
    provider: str  # "groq" | "deterministic-fallback"


@dataclass(frozen=True)
class NegotiationTranscript:
    round_1: tuple[AgentArgument, ...]
    round_2: tuple[AgentArgument, ...]
    coordinator: CoordinatorNarration


_NUMBER_RE = re.compile(r"(?<![A-Z])-?\d+(?:\.\d+)?")


def _normalize_number(value: float) -> str:
    return f"{float(value):g}"


def extract_numbers(text: str) -> set[str]:
    return {_normalize_number(float(m)) for m in _NUMBER_RE.findall(text)}
