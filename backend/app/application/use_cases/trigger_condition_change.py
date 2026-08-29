"""
application/use_cases/trigger_condition_change.py

Orchestration only. Integrates the traffic-condition-change simulator with the deterministic
decision core: post-change metrics -> post-change utility -> SWITCH/STAY (current mode vs
alternatives). Only the car metrics are re-derived; two_wheeler/cycling carry over from the
trip's baseline unchanged (Phase 2 brief Part 8: never double-count traffic).
"""

from __future__ import annotations

from dataclasses import dataclass

from app.domain.decision.entities import ConditionChange, Trip
from app.domain.decision.switch_policy import evaluate_switch
from app.domain.decision.utility import compute_utility_scores
from app.domain.enrichment.interfaces import CostCarbonProvider
from app.domain.routing.interfaces import ConditionChangeSimulator
from app.application.services.trip_store import TripStore


@dataclass(frozen=True)
class ConditionChangeResult:
    trip: Trip
    excluded: dict[str, str]
    timings: dict


class TriggerConditionChangeUseCase:
    def __init__(
        self,
        traffic_simulator: ConditionChangeSimulator,
        enrichment: CostCarbonProvider,
        trip_store: TripStore,
    ):
        self._traffic_simulator = traffic_simulator
        self._enrichment = enrichment
        self._trip_store = trip_store

    async def execute(self, trip_id: str) -> ConditionChangeResult:
        trip = self._trip_store.get(trip_id)  # raises TripNotFoundError

        post_car_route, timings = await self._traffic_simulator.apply_condition_change(
            "car", trip.origin, trip.destination
        )
        post_car_metrics = self._enrichment.enrich(post_car_route)

        # Re-apply cooperation savings if the baseline trip had them
        baseline_car = trip.baseline_metrics.get("car")
        had_coop = baseline_car and baseline_car.routing_disclosure and "(Includes Co-op Savings)" in baseline_car.routing_disclosure
        if had_coop and post_car_metrics.distance_km and post_car_metrics.estimated_cost_inr is not None and post_car_metrics.estimated_carbon_g is not None:
            cost_saving = round(post_car_metrics.distance_km * 3.0, 2)
            carbon_saving = round(post_car_metrics.distance_km * 113.0, 2)
            new_cost = max(0.0, round(post_car_metrics.estimated_cost_inr - cost_saving, 2))
            new_carbon = max(0.0, round(post_car_metrics.estimated_carbon_g - carbon_saving, 2))
            
            post_car_metrics = type(post_car_metrics)(
                mode=post_car_metrics.mode,
                distance_km=post_car_metrics.distance_km,
                duration_min=post_car_metrics.duration_min,
                estimated_cost_inr=new_cost,
                estimated_carbon_g=new_carbon,
                available=post_car_metrics.available,
                routing_source=post_car_metrics.routing_source,
                routing_disclosure=(post_car_metrics.routing_disclosure or "") + " (Includes Co-op Savings)",
                route_geometry=post_car_metrics.route_geometry
            )

        post_change_metrics = {post_car_metrics.mode: post_car_metrics} | {
            mode: m for mode, m in trip.baseline_metrics.items() if mode != "car"
        }

        # Reuse the same weight vector the baseline was scored with -- a mid-trip condition
        # change must not silently re-weight the decision against a different preference
        # vector than the one the user's baseline recommendation came from.
        utility_output = compute_utility_scores(list(post_change_metrics.values()), weights=trip.weights_used or None)
        usable_metrics = {mode: m for mode, m in post_change_metrics.items() if m.available}
        decision = evaluate_switch(trip.current_mode, usable_metrics, utility_output.results)

        trip.condition_change = ConditionChange(type="simulated_traffic_surge", is_simulated=True)
        trip.post_change_metrics = post_change_metrics
        trip.post_change_utilities = utility_output.results
        trip.decision = decision
        self._trip_store.save(trip)

        return ConditionChangeResult(trip=trip, excluded=utility_output.excluded, timings=timings)
