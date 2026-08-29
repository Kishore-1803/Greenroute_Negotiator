"""
domain/preference/entities.py

Preference Memory's core entity -- a per-user weight vector over the same three utility
dimensions domain.decision.utility already normalizes (time/cost/carbon), learned from
observed mode choices (Master Plan Section 3/5: Venkatram KS's "Preference Learning &
Storage"). Pure Python -- no SQLite, no pydantic, no FastAPI here (Part E).
"""

from __future__ import annotations

from dataclasses import dataclass

STATED_PRIORITIES = ("speed", "cost", "carbon", "balanced")

# Cold-start presets (Master Plan Section 3/10: "cold-start presets for new users"). A
# first-time user has no learned vector yet, so their stated priority at their first trip
# selects one of these instead of the system inventing an arbitrary starting point. Chosen to
# keep the same relative ordering as domain.decision.utility's original fixed weights
# (0.45/0.30/0.25) for "balanced", so a brand-new user with no stated priority reproduces the
# deterministic engine's pre-Preference-Memory behaviour exactly.
COLD_START_PRESETS: dict[str, tuple[float, float, float]] = {
    "speed": (0.70, 0.20, 0.10),
    "cost": (0.20, 0.70, 0.10),
    "carbon": (0.10, 0.20, 0.70),
    "balanced": (0.45, 0.30, 0.25),
}


@dataclass(frozen=True)
class UserPreference:
    user_id: str
    w_time: float
    w_cost: float
    w_carbon: float
    trip_count: int

    def as_weights(self) -> dict[str, float]:
        """The shape domain.decision.utility.compute_utility_scores expects."""
        return {"time": self.w_time, "cost": self.w_cost, "carbon": self.w_carbon}
