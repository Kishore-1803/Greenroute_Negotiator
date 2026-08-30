"""
application/use_cases/trigger_condition_change.py

Orchestration only. Integrates the traffic-condition-change simulator with the deterministic
decision core: post-change metrics -> post-change utility -> SWITCH/STAY (current mode vs
alternatives). Only the car metrics are re-derived; two_wheeler/cycling carry over from the
trip's baseline unchanged (Phase 2 brief Part 8: never double-count traffic).
"""

from __future__ import annotations

from dataclasses import dataclass

from app.application.services.trip_store import TripStore
from app.domain.decision.entities import ConditionChange, Trip
from app.domain.decision.switch_policy import evaluate_switch
from app.domain.decision.utility import compute_utility_scores
from app.domain.enrichment.interfaces import CostCarbonProvider
from app.domain.negotiation.adjustments import AGENT_ROLES, apply_agent_adjustments
from app.domain.routing.interfaces import ConditionChangeSimulator


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

        # Mix at the RAW level, then re-run the specialist adjustments over the whole set. The
        # surged car route comes back unadjusted from enrichment, so combining it directly with
        # the (already adjusted) baseline_metrics would compare an unadjusted car against
        # adjusted alternatives -- the surge would look better than it is purely because car
        # dodged its parking/ownership penalties. Re-deriving keeps every mode on the same basis.
        post_change_raw = {post_car_metrics.mode: post_car_metrics} | {
            mode: m for mode, m in (trip.raw_metrics or trip.baseline_metrics).items() if mode != "car"
        }
        post_change_metrics, adjustment_outcome = apply_agent_adjustments(
            post_change_raw,
            aqi=trip.aqi,
            active_agents=tuple(trip.adjustments.get("agents_active", AGENT_ROLES)) if trip.adjustments else AGENT_ROLES,
        )

        # Carry the baseline's carpool discount onto the surged car too, if it had one -- so the
        # surge is compared against the same "shared ride" car the recommendation was made with.
        baseline_car = trip.baseline_metrics.get("car")
        had_coop = bool(
            baseline_car
            and baseline_car.routing_disclosure
            and "(Includes Co-op Savings)" in baseline_car.routing_disclosure
        )
        surged_car = post_change_metrics.get("car")
        if had_coop and surged_car and surged_car.distance_km and surged_car.estimated_cost_inr is not None and surged_car.estimated_carbon_g is not None:
            cost_saving = round(surged_car.distance_km * 3.0, 2)
            carbon_saving = round(surged_car.distance_km * 113.0, 2)
            post_change_metrics["car"] = type(surged_car)(
                mode=surged_car.mode,
                distance_km=surged_car.distance_km,
                duration_min=surged_car.duration_min,
                estimated_cost_inr=max(0.0, round(surged_car.estimated_cost_inr - cost_saving, 2)),
                estimated_carbon_g=max(0.0, round(surged_car.estimated_carbon_g - carbon_saving, 2)),
                available=surged_car.available,
                routing_source=surged_car.routing_source,
                routing_disclosure=(surged_car.routing_disclosure or "") + " (Includes Co-op Savings)",
                route_geometry=surged_car.route_geometry,
                stops=getattr(surged_car, "stops", None),
                traffic_segments=getattr(surged_car, "traffic_segments", None),
            )

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
        trip.adjustments = adjustment_outcome.as_dict()
        self._trip_store.save(trip)

        return ConditionChangeResult(trip=trip, excluded=utility_output.excluded, timings=timings)
