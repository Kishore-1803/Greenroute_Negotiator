"""
application/use_cases/evaluate_baseline.py

Orchestration only (Part A's Modularity Rule: "Application use case: orchestration only") --
OSRM -> ModeMetrics -> utility, for the baseline (pre-condition-change) state. No business
rule lives here; it all lives in domain.decision.utility and the injected
RoutingProvider/CostCarbonProvider implementations.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from app.domain.common.errors import ValidationError
from app.domain.decision.entities import TRACKED_MODES, Trip
from app.domain.decision.utility import compute_utility_scores
from app.domain.enrichment.interfaces import CostCarbonProvider
from app.domain.preference.entities import STATED_PRIORITIES, UserPreference
from app.domain.preference.interfaces import PreferenceStore
from app.domain.routing.interfaces import RoutingProvider
from app.application.services.trip_store import TripStore


@dataclass(frozen=True)
class BaselineResult:
    trip: Trip
    excluded: dict[str, str]
    best_mode: str | None
    preference: UserPreference


class EvaluateBaselineUseCase:
    def __init__(
        self,
        routing: RoutingProvider,
        enrichment: CostCarbonProvider,
        trip_store: TripStore,
        preference_store: PreferenceStore,
    ):
        self._routing = routing
        self._enrichment = enrichment
        self._trip_store = trip_store
        self._preference_store = preference_store

    async def execute(
        self,
        origin: tuple[float, float],
        destination: tuple[float, float],
        current_mode: str | None,
        user_id: str,
        stated_priority: str | None,
        custom_weights: dict[str, float] | None = None,
        willing_to_carpool: bool = True,
    ) -> BaselineResult:
        # current_mode is OPTIONAL (Master Plan primary flow: a brand-new trip has no "current"
        # mode yet -- the whole point of the recommendation is to pick one). It is only load-
        # bearing for the advanced condition-change/SWITCH-STAY flow, which needs a mode to
        # evaluate switching away from; when omitted here it is set to the utility winner below,
        # once known, so that flow still has a sensible starting point if the user continues on.
        if current_mode is not None and current_mode not in TRACKED_MODES:
            raise ValidationError(f"current_mode must be one of {TRACKED_MODES}, got {current_mode!r}")
        if stated_priority is not None and stated_priority not in STATED_PRIORITIES:
            raise ValidationError(f"stated_priority must be one of {STATED_PRIORITIES}, got {stated_priority!r}")
        if not user_id:
            raise ValidationError("user_id is required (Preference Memory needs a stable identity per caller)")
        if custom_weights is not None:
            missing = {"time", "cost", "carbon"} - set(custom_weights)
            if missing:
                raise ValidationError(f"custom_weights is missing keys: {sorted(missing)}")
            if any(v < 0 for v in custom_weights.values()):
                raise ValidationError("custom_weights values must be non-negative")
            if sum(custom_weights.values()) <= 0:
                raise ValidationError("custom_weights must sum to a positive value")

        # Preference Memory (Master Plan Section 3): existing users get their learned vector
        # back; a brand-new user_id is cold-started from stated_priority (or "balanced"). This
        # lookup always happens (even when custom_weights overrides it below) so trip_count/
        # identity bookkeeping and the returned `preference` DTO stay meaningful.
        preference = self._preference_store.get_or_create(user_id, stated_priority)

        # Master Plan "Preference Slider" (Section 11): a user-supplied continuous weight
        # vector, normalized to sum to 1, takes precedence over the stored/cold-start vector for
        # THIS baseline's utility computation only -- it is not persisted to Preference Memory
        # (only an actual mode selection differing from the recommendation should move the
        # learned vector, per record_selection.py).
        if custom_weights is not None:
            total = sum(custom_weights.values())
            weights = {k: v / total for k, v in custom_weights.items()}
        else:
            weights = preference.as_weights()

        routes = await self._routing.route_all_modes(origin, destination)
        mode_metrics = [self._enrichment.enrich(route) for route in routes.values()]

        # --- Inject Cooperation Potential ---
        # If a viable carpool/relay commuter exists, adjust the Car's cost/carbon 
        # BEFORE computing utility, so it can actually win the recommendation.
        from app.infrastructure.cooperation.commuter_pool import COIMBATORE_COMMUTERS
        from app.domain.cooperation.overlap import compatibility
        
        car_m = next((m for m in mode_metrics if m.mode == "car" and m.available), None)
        if willing_to_carpool and car_m and car_m.distance_km and car_m.estimated_cost_inr is not None and car_m.estimated_carbon_g is not None:
            best_comp = 0.0
            for commuter in COIMBATORE_COMMUTERS:
                comp = compatibility(
                    user_origin=origin,
                    user_dest=destination,
                    user_departure_hour=8.5,
                    commuter=commuter,
                    user_route_km=car_m.distance_km,
                    commuter_route_km=10.0
                )
                if comp > best_comp:
                    best_comp = comp
                    
            if best_comp >= 0.2:
                # We have a match! Apply expected savings to the baseline metrics
                cost_saving = round(car_m.distance_km * 3.0, 2)
                carbon_saving = round(car_m.distance_km * 113.0, 2)
                
                new_cost = max(0.0, round(car_m.estimated_cost_inr - cost_saving, 2))
                new_carbon = max(0.0, round(car_m.estimated_carbon_g - carbon_saving, 2))
                
                adjusted_car = type(car_m)(
                    mode=car_m.mode,
                    distance_km=car_m.distance_km,
                    duration_min=car_m.duration_min,
                    estimated_cost_inr=new_cost,
                    estimated_carbon_g=new_carbon,
                    available=car_m.available,
                    routing_source=car_m.routing_source,
                    routing_disclosure=(car_m.routing_disclosure or "") + " (Includes Co-op Savings)",
                    route_geometry=car_m.route_geometry
                )
                mode_metrics = [adjusted_car if m.mode == "car" else m for m in mode_metrics]
        # ------------------------------------

        utility_output = compute_utility_scores(mode_metrics, weights=weights)

        best_mode = None
        if utility_output.results:
            best_mode = max(utility_output.results, key=lambda mode: utility_output.results[mode].utility)

        trip = Trip(
            trip_id=str(uuid.uuid4()),
            origin=origin,
            destination=destination,
            current_mode=current_mode or best_mode or TRACKED_MODES[0],
            baseline_metrics={m.mode: m for m in mode_metrics},
            baseline_utilities=utility_output.results,
            weights_used=weights,
            user_id=user_id,
            best_mode=best_mode,
        )
        self._trip_store.save(trip)

        return BaselineResult(trip=trip, excluded=utility_output.excluded, best_mode=best_mode, preference=preference)
