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

from app.application.services.trip_store import TripStore
from app.domain.common.errors import ValidationError
from app.domain.decision.entities import TRACKED_MODES, Trip
from app.domain.decision.utility import compute_utility_scores
from app.domain.enrichment.interfaces import CostCarbonProvider
from app.domain.negotiation.adjustments import (
    AGENT_ROLES,
    AdjustmentOutcome,
    apply_agent_adjustments,
)
from app.domain.preference.entities import STATED_PRIORITIES, UserPreference
from app.domain.preference.interfaces import PreferenceStore
from app.domain.routing.interfaces import RoutingProvider


@dataclass(frozen=True)
class BaselineResult:
    trip: Trip
    excluded: dict[str, str]
    best_mode: str | None
    preference: UserPreference
    adjustments: AdjustmentOutcome


class EvaluateBaselineUseCase:
    def __init__(
        self,
        routing: RoutingProvider,
        enrichment: CostCarbonProvider,
        trip_store: TripStore,
        preference_store: PreferenceStore,
        weather_provider=None,
    ):
        self._routing = routing
        self._enrichment = enrichment
        self._trip_store = trip_store
        self._preference_store = preference_store
        self._weather_provider = weather_provider

    async def execute(
        self,
        origin: tuple[float, float],
        destination: tuple[float, float],
        current_mode: str | None,
        user_id: str,
        stated_priority: str | None,
        custom_weights: dict[str, float] | None = None,
        willing_to_carpool: bool = True,
        aqi: float | None = None,
        active_agents: tuple[str, ...] = AGENT_ROLES,
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
        if aqi is not None and aqi < 0:
            raise ValidationError(f"aqi must be non-negative, got {aqi}")
        unknown_agents = set(active_agents) - set(AGENT_ROLES)
        if unknown_agents:
            raise ValidationError(f"unknown specialist agent(s): {sorted(unknown_agents)}")

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
        raw_metrics = {m.mode: m for m in (self._enrichment.enrich(route) for route in routes.values())}

        weather = None
        if self._weather_provider:
            weather_cond = await self._weather_provider.get_current_weather(origin)
            if weather_cond:
                weather = {
                    "temp_c": weather_cond.temp_c,
                    "description": weather_cond.description,
                    "precip_mm": weather_cond.precip_mm,
                    "is_raining": weather_cond.is_raining,
                }
            
            car_m = raw_metrics.get("car")
            if car_m and car_m.distance_km and car_m.distance_km > 50.0:
                dest_cond = await self._weather_provider.get_current_weather(destination)
                if dest_cond:
                    if not weather:
                        weather = {
                            "temp_c": dest_cond.temp_c,
                            "description": dest_cond.description,
                            "precip_mm": dest_cond.precip_mm,
                            "is_raining": dest_cond.is_raining,
                        }
                    else:
                        weather["dest_temp_c"] = dest_cond.temp_c
                        weather["dest_description"] = dest_cond.description
                        weather["is_raining"] = weather["is_raining"] or dest_cond.is_raining

        # The specialist agents' MATERIAL step (Master Plan Section 3, made load-bearing): each
        # active agent proposes a bounded, reasoned adjustment against its own channel, the
        # proposals are summed per channel and clamped, and the utility formula then runs on
        # the ADJUSTED metrics -- not on the raw routing output. Deleting an agent therefore
        # changes the scores, and can change the recommendation. See adjustments.py for why
        # these deltas are computed deterministically here rather than chosen by an LLM.
        adjusted_metrics, adjustment_outcome = apply_agent_adjustments(
            raw_metrics, aqi=aqi, weather=weather, active_agents=active_agents
        )

        # --- Cooperation potential (carpool / relay) ---
        # If a viable carpool commuter exists for this route, discount the Car's cost/carbon on
        # top of the agent adjustments above, BEFORE scoring, so a shared ride can actually win
        # the recommendation. See infrastructure/cooperation/ + domain/cooperation/overlap.py.
        adjusted_metrics = self._apply_cooperation_savings(
            adjusted_metrics, origin, destination, willing_to_carpool
        )

        utility_output = compute_utility_scores(list(adjusted_metrics.values()), weights=weights)

        best_mode = None
        if utility_output.results:
            best_mode = max(utility_output.results, key=lambda mode: utility_output.results[mode].utility)

        trip = Trip(
            trip_id=str(uuid.uuid4()),
            origin=origin,
            destination=destination,
            current_mode=current_mode or best_mode or TRACKED_MODES[0],
            baseline_metrics=adjusted_metrics,
            baseline_utilities=utility_output.results,
            weights_used=weights,
            user_id=user_id,
            best_mode=best_mode,
            raw_metrics=raw_metrics,
            adjustments=adjustment_outcome.as_dict(),
            aqi=aqi,
            weather=weather,
        )
        self._trip_store.save(trip)

        return BaselineResult(
            trip=trip,
            excluded=utility_output.excluded,
            best_mode=best_mode,
            preference=preference,
            adjustments=adjustment_outcome,
        )

    @staticmethod
    def _apply_cooperation_savings(
        metrics: dict[str, object],
        origin: tuple[float, float],
        destination: tuple[float, float],
        willing_to_carpool: bool,
    ) -> dict:
        from app.domain.cooperation.overlap import compatibility
        from app.infrastructure.cooperation.commuter_pool import COIMBATORE_COMMUTERS

        car_m = metrics.get("car")
        if not (
            willing_to_carpool
            and car_m is not None
            and getattr(car_m, "available", False)
            and car_m.distance_km
            and car_m.estimated_cost_inr is not None
            and car_m.estimated_carbon_g is not None
        ):
            return metrics

        best_comp = 0.0
        for commuter in COIMBATORE_COMMUTERS:
            comp = compatibility(
                user_origin=origin,
                user_dest=destination,
                user_departure_hour=8.5,
                commuter=commuter,
                user_route_km=car_m.distance_km,
                commuter_route_km=10.0,
            )
            best_comp = max(best_comp, comp)

        if best_comp < 0.2:
            return metrics

        cost_saving = round(car_m.distance_km * 3.0, 2)
        carbon_saving = round(car_m.distance_km * 113.0, 2)
        adjusted_car = type(car_m)(
            mode=car_m.mode,
            distance_km=car_m.distance_km,
            duration_min=car_m.duration_min,
            estimated_cost_inr=max(0.0, round(car_m.estimated_cost_inr - cost_saving, 2)),
            estimated_carbon_g=max(0.0, round(car_m.estimated_carbon_g - carbon_saving, 2)),
            available=car_m.available,
            routing_source=car_m.routing_source,
            routing_disclosure=(car_m.routing_disclosure or "") + " (Includes Co-op Savings)",
            route_geometry=car_m.route_geometry,
            stops=getattr(car_m, "stops", None),
            traffic_segments=getattr(car_m, "traffic_segments", None),
        )
        return {mode: (adjusted_car if mode == "car" else m) for mode, m in metrics.items()}
