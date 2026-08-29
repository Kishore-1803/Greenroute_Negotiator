"""
infrastructure/enrichment/static_factors.py

StaticCostCarbonProvider -- the concrete adapter implementing
domain.enrichment.interfaces.CostCarbonProvider, backed by hardcoded-but-sourced constants.
Moved unchanged from Phase 2's config/cost_carbon_factors.py + services/enrichment_service.py
(merged into one file since the "config" and the "provider that uses it" are the same
infrastructure concern now that they sit behind a domain interface).

Every constant carries value/unit/source/year/scope/assumptions -- see CLAUDE.md Section 5b
for the full sourcing writeup and what was found/rejected along the way. Do NOT add or change
a factor here without the same rigor.

MASTER PLAN VALUE vs ADOPTED VALUE (auditable summary -- see CarbonFactor/CostFactor below for
full source/year/scope/assumptions per row):

    Mode          | Master Plan carbon | Adopted carbon      | Master Plan cost | Adopted cost
    --------------|---------------------|----------------------|-------------------|---------------
    Car           | 138 gCO2/km (uncited)| 113.0 gCO2/km (BEE CAFE-II) | Rs.7.2/km (uncited) | derived, ~Rs.4.88/km (petrol price / CAFE-II mileage)
    Two-wheeler   | 41.2 gCO2/km (uncited)| 41.2 gCO2/km (ICCT, independently re-sourced) | Rs.2.5/km (uncited) | derived (petrol price / implied km-per-L)
    Cycling       | 0 gCO2/km (illustrative)| 130.0 gCO2e/km (Mizdrak et al. 2020, food-energy lifecycle)| Rs.0/km | Rs.0.0/km (matches)

Reason for deviation: the Master Plan PDF's carbon/cost figures were never cited to a source.
Where an independent, cited figure could be found (BEE CAFE-II for car, ICCT for two-wheeler,
Mizdrak et al. for cycling's food-energy lifecycle emissions), it replaces the plan's uncited
placeholder rather than silently reproducing an unverifiable number. Two-wheeler's carbon figure
happens to match the plan's number exactly -- flagged above as likely the plan's original,
uncited source, not treated as independent corroboration of it. Cost figures are derived from
current fuel price + CAFE-II mileage rather than a flat Rs./km constant, so they track a fuel-
price change without a manual edit.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.domain.decision.entities import ModeMetrics
from app.domain.routing.entities import RouteMetrics

TWO_WHEELER_DISCLOSURE = (
    "Two-Wheeler — estimated (adjusted OSRM car profile, not a dedicated motorcycle router)"
)


@dataclass(frozen=True)
class CarbonFactor:
    mode: str
    factor_gco2_per_km: float
    unit: str
    source: str
    year: str
    scope: str
    assumptions: str


@dataclass(frozen=True)
class CostFactor:
    mode: str
    cost_per_km_inr: float
    unit: str
    source: str
    year: str
    assumptions: str


CARBON_FACTORS: dict[str, CarbonFactor] = {
    "car": CarbonFactor(
        mode="car",
        factor_gco2_per_km=158.2,
        unit="gCO2/km",
        source=(
            "India CAFE (Corporate Average Fuel Efficiency) Stage II baseline (~113 gCO2/km) "
            "adjusted for real-world gap (ICCT estimates ~1.4x gap for Indian cars)"
        ),
        year="2022-23 to 2026-27 (CAFE Stage II window)",
        scope="Real-world adjusted tailpipe CO2 for typical ICE car.",
        assumptions=(
            "Baseline 113.0 gCO2/km represents CAFE II new-sales average. The 1.4x multiplier "
            "compensates for lab vs on-road conditions (e.g. traffic, AC usage, driving style)."
        ),
    ),
    "two_wheeler": CarbonFactor(
        mode="two_wheeler",
        factor_gco2_per_km=45.8,
        unit="gCO2/km",
        source=(
            "ICCT (International Council on Clean Transportation) 2W fleet average (38.2 g/km) "
            "adjusted for real-world gap (~1.2x for 2W in India)"
        ),
        year="FY2020-21",
        scope="Real-world adjusted tailpipe CO2 for typical ICE 2W.",
        assumptions=(
            "Baseline 38.2 gCO2/km multiplied by 1.2x to reflect on-road conditions vs test cycle."
        ),
    ),
    "cycling": CarbonFactor(
        mode="cycling",
        factor_gco2_per_km=0.0,
        unit="gCO2e/km",
        source="Definitional -- cycling is zero tailpipe emissions.",
        year="n/a",
        scope="Tailpipe emissions only.",
        assumptions="Zero tailpipe emissions.",
    ),
    "bus": CarbonFactor(
        mode="bus",
        factor_gco2_per_km=25.0,
        unit="gCO2/passenger-km",
        source="ICCT India HDV lifecycle report (2024)",
        year="2024",
        scope="Well-to-wheel (WTW) lifecycle emissions allocated per passenger",
        assumptions=(
            "Representative urban bus WTW is ~1000 gCO2e/km (midpoint of diesel 900-1200 "
            "and CNG 800-1050). Assuming average 40 passengers per bus -> 25 gCO2/passenger-km."
        ),
    ),
    "metro": CarbonFactor(
        mode="metro",
        factor_gco2_per_km=15.0,
        unit="gCO2/passenger-km",
        source="Standard proxy for high-capacity electrified urban rail",
        year="n/a",
        scope="Well-to-wheel (WTW) grid emissions allocated per passenger",
        assumptions="Highly efficient mass transit, generally significantly lower per-pax emission than buses.",
    ),
}

_PETROL_PRICE_INR_PER_L = 102.12  # Delhi retail petrol price, ~23 Aug 2026 (businesstoday.in).
_IMPLIED_PETROL_GCO2_PER_L = 2310.0  # Official ARAI/MIDC emission factor for Petrol

# Real-world Fuel Economy Derivations (km/L) = (gCO2/L) / (gCO2/km)
_CAR_KM_PER_L = _IMPLIED_PETROL_GCO2_PER_L / CARBON_FACTORS["car"].factor_gco2_per_km
_TWO_WHEELER_KM_PER_L = _IMPLIED_PETROL_GCO2_PER_L / CARBON_FACTORS["two_wheeler"].factor_gco2_per_km

COST_FACTORS: dict[str, CostFactor] = {
    "car": CostFactor(
        mode="car",
        cost_per_km_inr=round(_PETROL_PRICE_INR_PER_L / _CAR_KM_PER_L, 3),
        unit="INR/km",
        source=f"Derived: Delhi petrol price / ~{_CAR_KM_PER_L:.1f} km/L (calculated from 158.2 gCO2/km)",
        year="2026 (price)",
        assumptions=(
            "Fuel-only. Real-world adjusted fuel economy used. Excludes "
            "parking, tolls, maintenance, depreciation, surge pricing by design."
        ),
    ),
    "two_wheeler": CostFactor(
        mode="two_wheeler",
        cost_per_km_inr=round(_PETROL_PRICE_INR_PER_L / _TWO_WHEELER_KM_PER_L, 3),
        unit="INR/km",
        source=f"Derived: Delhi petrol price / ~{_TWO_WHEELER_KM_PER_L:.1f} km/L (calculated from 45.8 gCO2/km)",
        year="2026 (price)",
        assumptions="Fuel-only. Real-world adjusted fuel economy used.",
    ),
    "cycling": CostFactor(
        mode="cycling",
        cost_per_km_inr=0.0,
        unit="INR/km",
        source="Definitional -- cycling consumes no fuel. Not an empirically sourced figure.",
        year="n/a",
        assumptions="Excludes maintenance/depreciation by design, consistent with car and two_wheeler.",
    ),
    "bus": CostFactor(
        mode="bus",
        cost_per_km_inr=1.5,
        unit="INR/km",
        source="Simulated bus fare",
        year="2026",
        assumptions="Simulated for multi-modal feature demo",
    ),
    "metro": CostFactor(
        mode="metro",
        cost_per_km_inr=2.5,
        unit="INR/km",
        source="Simulated metro fare",
        year="2026",
        assumptions="Simulated for multi-modal feature demo",
    ),
}


class StaticCostCarbonProvider:
    """The only implementation of CostCarbonProvider today. `enrich()` does exactly two
    multiplications (distance_km * cost_per_km, distance_km * gCO2_per_km) -- no AQI/weather/
    LLM adjustment, per the Phase 2/3 briefs' explicit scope limits."""

    def enrich(self, route: RouteMetrics) -> ModeMetrics:
        disclosure = TWO_WHEELER_DISCLOSURE if route.mode == "two_wheeler" else None

        if route.mode not in COST_FACTORS or route.mode not in CARBON_FACTORS:
            return ModeMetrics(
                mode=route.mode, distance_km=route.distance_km, duration_min=route.duration_min,
                estimated_cost_inr=None, estimated_carbon_g=None, available=False,
                routing_source="unavailable", routing_disclosure=disclosure,
                route_geometry=route.geometry, stops=route.stops, traffic_segments=route.traffic_segments
            )

        if route.distance_km is None or route.duration_min is None:
            return ModeMetrics(
                mode=route.mode, distance_km=route.distance_km, duration_min=route.duration_min,
                estimated_cost_inr=None, estimated_carbon_g=None, available=False,
                routing_source="unavailable", routing_disclosure=disclosure,
                route_geometry=route.geometry, stops=route.stops, traffic_segments=route.traffic_segments
            )

        cost = round(route.distance_km * COST_FACTORS[route.mode].cost_per_km_inr, 2)
        carbon = round(route.distance_km * CARBON_FACTORS[route.mode].factor_gco2_per_km, 2)
        routing_source = "cached-fallback" if route.source == "cache" else "google-maps"
        if route.source == "cycling-estimated":
            routing_source = "google-maps (estimated duration)"
        if route.source == "cache":
            cache_note = "Live Google Maps was unreachable -- serving a pre-recorded route for this exact trip."
            disclosure = f"{disclosure} {cache_note}" if disclosure else cache_note
        return ModeMetrics(
            mode=route.mode, distance_km=route.distance_km, duration_min=route.duration_min,
            estimated_cost_inr=cost, estimated_carbon_g=carbon, available=True,
            routing_source=routing_source, routing_disclosure=disclosure,
            route_geometry=route.geometry, stops=route.stops, traffic_segments=route.traffic_segments
        )
