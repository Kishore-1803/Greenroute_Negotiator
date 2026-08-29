"""
application/use_cases/record_selection.py

Orchestration only. Closes the Preference Memory loop (Master Plan Section 11/12): a user's
actual mode choice, compared against what the system recommended, is the only signal that
should ever move a learned weight vector. Agreement with the recommendation carries no
learning signal and is a no-op here, matching the plan's "when a user selects a mode different
from the recommended mode, update weights" trigger condition.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.application.services.trip_store import TripStore
from app.domain.common.errors import ValidationError
from app.domain.decision.entities import TRACKED_MODES, Trip
from app.domain.preference.entities import UserPreference
from app.domain.preference.interfaces import PreferenceStore


@dataclass(frozen=True)
class SelectionResult:
    trip: Trip
    recommended_mode: str
    weights_changed: bool
    preference: UserPreference


def _recommended_mode(trip: Trip) -> str:
    """The mode the system was actually recommending at the moment of selection: the
    switch-policy's winner if a condition-change decision has been computed (advanced flow),
    otherwise the baseline utility winner (Master Plan primary flow: a fresh trip's
    recommendation IS best_mode, not whatever current_mode happened to default to). Falls back
    to current_mode only if best_mode was never computed (e.g. zero usable modes)."""
    if trip.decision is not None:
        return trip.decision.recommended_mode or trip.decision.current_mode
    return trip.best_mode or trip.current_mode


class RecordSelectionUseCase:
    def __init__(self, preference_store: PreferenceStore, trip_store: TripStore, impact_store=None):
        self._preference_store = preference_store
        self._trip_store = trip_store
        self._impact_store = impact_store

    def execute(
        self,
        trip_id: str,
        selected_mode: str,
        cooperation_used: bool = False,
        origin_name: str | None = None,
        destination_name: str | None = None,
        duration_min: float | None = None,
    ) -> SelectionResult:
        import json
        if selected_mode not in TRACKED_MODES:
            raise ValidationError(f"selected_mode must be one of {TRACKED_MODES}, got {selected_mode!r}")

        trip = self._trip_store.get(trip_id)  # raises TripNotFoundError
        recommended_mode = _recommended_mode(trip)
        utilities = trip.post_change_utilities or trip.baseline_utilities

        for mode in (selected_mode, recommended_mode):
            if mode not in utilities:
                raise ValidationError(f"mode {mode!r} has no usable utility score on this trip to learn from")

        if self._impact_store:
            baseline_car = trip.baseline_metrics.get("car")
            selected_metrics = trip.baseline_metrics.get(selected_mode)
            if selected_metrics and baseline_car:
                dist = selected_metrics.distance_km or 0.0
                carbon = selected_metrics.estimated_carbon_g or 0.0
                cost = selected_metrics.estimated_cost_inr or 0.0
                car_carbon = baseline_car.estimated_carbon_g or 0.0
                car_cost = baseline_car.estimated_cost_inr or 0.0
                dur = duration_min if duration_min is not None else selected_metrics.duration_min

                # Calculate Eco Score (0-100)
                base_eco = {
                    "cycling": 100.0,
                    "metro": 95.0,
                    "bus": 90.0,
                    "two_wheeler": 80.0,
                    "car": 75.0 if cooperation_used else 55.0,
                }.get(selected_mode, 70.0)

                geom_str = json.dumps(selected_metrics.route_geometry) if selected_metrics.route_geometry else None

                self._impact_store.record_trip(
                    user_id=trip.user_id,
                    trip_id=trip.trip_id,
                    selected_mode=selected_mode,
                    distance_km=dist,
                    carbon_g=carbon,
                    cost_inr=cost,
                    carbon_saved_vs_car_g=max(0.0, car_carbon - carbon),
                    cost_saved_vs_car_inr=max(0.0, car_cost - cost),
                    cooperation_used=cooperation_used,
                    origin_name=origin_name,
                    destination_name=destination_name,
                    duration_min=dur,
                    route_geometry=geom_str,
                    eco_score=round(base_eco, 1),
                )

        if selected_mode == recommended_mode:
            preference = self._preference_store.get_or_create(trip.user_id, stated_priority=None)
            return SelectionResult(
                trip=trip, recommended_mode=recommended_mode, weights_changed=False, preference=preference
            )

        selected_vector = {
            "time": utilities[selected_mode].norm_time,
            "cost": utilities[selected_mode].norm_cost,
            "carbon": utilities[selected_mode].norm_carbon,
        }
        recommended_vector = {
            "time": utilities[recommended_mode].norm_time,
            "cost": utilities[recommended_mode].norm_cost,
            "carbon": utilities[recommended_mode].norm_carbon,
        }
        preference = self._preference_store.update(trip.user_id, selected_vector, recommended_vector)
        return SelectionResult(trip=trip, recommended_mode=recommended_mode, weights_changed=True, preference=preference)
