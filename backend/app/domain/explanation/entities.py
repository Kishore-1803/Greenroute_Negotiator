"""
domain/explanation/entities.py

Structured input/output for the explanation-only LLM role (Blueprint Section 5; Phase 3
Parts G-H). ExplanationContext carries ONLY already-computed facts -- there is no field an
LLM could use to compute a new number, by construction.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

# The small, finite objection categories this system supports (Part I). Anything else is
# handled as "unsupported constraint" -- the LLM must say so, never pretend to incorporate it.
OBJECTION_CATEGORIES = (
    "why_switch",
    "why_stay",
    "what_changed",
    "is_traffic_real",
    "are_emissions_exact",
    "why_this_mode",
    "unsupported_constraint",
)


@dataclass(frozen=True)
class ExplanationContext:
    current_mode: str
    recommended_mode: str | None
    decision: str  # "SWITCH" | "STAY"
    utility_advantage: float | None
    time_saved_min: float | None
    cost_saved_inr: float | None
    carbon_saved_g: float | None
    condition_change_type: str
    is_simulated: bool
    limitations: tuple[str, ...] = ()
    objection_category: str | None = None  # one of OBJECTION_CATEGORIES, or None for the initial explanation
    objection_text: str | None = None  # raw user text, for "unsupported_constraint" cases only

    def referenced_numbers(self) -> set[str]:
        """Every numeric value this context legitimately carries, as normalized strings, for
        output validation (Part H: reject any number in the output not present here)."""
        values = [
            self.utility_advantage,
            self.time_saved_min,
            self.cost_saved_inr,
            self.carbon_saved_g,
        ]
        out: set[str] = set()
        for v in values:
            if v is None:
                continue
            out.add(_normalize_number(v))
            out.add(_normalize_number(round(v)))  # allow the LLM to round e.g. 20.14 -> 20
        return out


@dataclass(frozen=True)
class ExplanationOutput:
    summary: str
    reason: str
    decision: str  # echoed, must match context.decision exactly
    limitations: tuple[str, ...]
    confidence_note: str
    provider: str  # "groq" | "deterministic-fallback"


_NUMBER_RE = re.compile(r"(?<![A-Z])-?\d+(?:\.\d+)?")
# Negative lookbehind excludes a digit stuck onto the end of an ALL-CAPS token (e.g. the "2"
# in "CO2") -- without it, mentioning carbon dioxide by its chemical formula in the same
# sentence as a real number makes the validator flag a phantom "2" as unsupported. Currency
# prefixes like "Rs9.94" are unaffected (lowercase "s" isn't excluded by this lookbehind).


def _normalize_number(value: float) -> str:
    """1230, 1230.0, and 1230.00 must all compare equal -- strip trailing zeros consistently."""
    return f"{float(value):g}"


def extract_numbers(text: str) -> set[str]:
    return {_normalize_number(float(m)) for m in _NUMBER_RE.findall(text)}
