"""domain/decision/value_objects.py -- immutable computed results, pure Python."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class UtilityScore:
    """Formerly UtilityResult (Phase 2). One mode's normalized dimensions + final score."""
    mode: str
    norm_time: float
    norm_cost: float
    norm_carbon: float
    utility: float


@dataclass(frozen=True)
class GateCheck:
    utility_gap: float
    absolute_gate_passed: bool
    time_saved_min: float
    cost_saved_inr: float
    carbon_saved_g: float


@dataclass(frozen=True)
class DecisionDelta:
    time_saved_min: float
    cost_saved_inr: float
    carbon_saved_g: float
