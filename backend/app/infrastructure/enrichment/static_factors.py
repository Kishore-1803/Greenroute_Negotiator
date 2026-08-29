"""
infrastructure/enrichment/static_factors.py

StaticCostCarbonProvider -- the concrete adapter implementing
domain.enrichment.interfaces.CostCarbonProvider, backed by hardcoded-but-sourced constants.
Moved unchanged from Phase 2's config/cost_carbon_factors.py + services/enrichment_service.py
(merged into one file since the "config" and the "provider that uses it" are the same
infrastructure concern now that they sit behind a domain interface).

Every constant carries value/unit/source/year/scope/assumptions inline in the CarbonFactor /
CostFactor entries below -- the full sourcing rationale is self-contained here and does not
require any external file. Do NOT add or change a factor without the same rigor.

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
        factor_gco2_per_km=113.0,
        unit="gCO2/km",
        source=(
            "India CAFE (Corporate Average Fuel Efficiency) Stage II CO2 emission ceiling, "
            "Bureau of Energy Efficiency (BEE), Ministry of Power, Government of India"
        ),
        year="2022-23 to 2026-27 (CAFE Stage II window)",
        scope=(
            "Regulatory corporate-average CO2 target for NEW passenger vehicle sales "
            "(petrol/diesel/CNG/LPG/hybrid/EV, GVW < 3500kg), not a measured average of the "
            "entire on-road fleet (which skews older/less efficient than new-sales average)."
        ),
        assumptions=(
            "Used as the best available India-specific proxy for a 'typical car' figure in "
            "the absence of a published on-road-fleet-average CO2/km figure. UK BEIS/Defra "
            "'Car (average)' (170.67 gCO2e/km, 2022 edition) was found first and rejected in "
            "favour of this India-specific figure. Differs from the old Master Plan PDF's "
            "uncited 138 gCO2/km placeholder -- not reproduced here, no source was ever found."
        ),
    ),
    "two_wheeler": CarbonFactor(
        mode="two_wheeler",
        factor_gco2_per_km=41.2,
        unit="gCO2/km",
        source=(
            "ICCT (International Council on Clean Transportation) working paper, "
            "'Fuel consumption standards for the new two-wheeler fleet in India' (Aug 2021), "
            "citing the Indian ICE two-wheeler new-sales fleet CO2 average used as the "
            "FY2018-19 baseline in that policy analysis"
        ),
        year="FY2018-19 (baseline year used in the 2021 working paper)",
        scope="India new-sales fleet average across scooters + motorcycles, not a measured on-road fleet average.",
        assumptions=(
            "NOTE: numerically identical to the old Master Plan PDF's uncited placeholder "
            "(41.2) -- independently re-sourced here to the ICCT paper, not copied from that "
            "uncited appearance. Flagged as a likely-real-original-source coincidence, not "
            "treated as independent corroboration."
        ),
    ),
    "cycling": CarbonFactor(
        mode="cycling",
        factor_gco2_per_km=130.0,
        unit="gCO2e/km",
        source=(
            "Mizdrak et al. 2020, Scientific Reports (Nature), 'Fuelling walking and cycling: "
            "human powered locomotion is associated with non-negligible greenhouse gas "
            "emissions' -- cycling estimated at ~half the paper's walking figure (260 gCO2e/km)"
        ),
        year="2020",
        scope="International estimate (no India-specific study found); full dietary-energy-compensation scenario.",
        assumptions=(
            "Deliberately non-zero (food-energy lifecycle emissions, not tailpipe -- cycling "
            "has none). Diverges from the Blueprint document's own illustrative ~15g examples, "
            "which were never sourced data."
        ),
    ),
}

_PETROL_PRICE_INR_PER_L = 102.12  # Delhi retail petrol price, ~23 Aug 2026 (businesstoday.in).
_CAFE_II_FUEL_CONSUMPTION_L_PER_100KM = 4.78  # BEE India CAFE Stage II, paired with the 113 gCO2/km ceiling.
_CAR_KM_PER_L = 100 / _CAFE_II_FUEL_CONSUMPTION_L_PER_100KM
_IMPLIED_PETROL_GCO2_PER_L = 113.0 / (_CAFE_II_FUEL_CONSUMPTION_L_PER_100KM / 100)
_TWO_WHEELER_L_PER_100KM = (CARBON_FACTORS["two_wheeler"].factor_gco2_per_km / _IMPLIED_PETROL_GCO2_PER_L) * 100
_TWO_WHEELER_KM_PER_L = 100 / _TWO_WHEELER_L_PER_100KM

COST_FACTORS: dict[str, CostFactor] = {
    "car": CostFactor(
        mode="car",
        cost_per_km_inr=round(_PETROL_PRICE_INR_PER_L / _CAR_KM_PER_L, 3),
        unit="INR/km",
        source="Derived: Delhi retail petrol price / 20.92 km/l (100/4.78 L-per-100km, India CAFE Stage II)",
        year="2026 (price) / CAFE Stage II window (mileage figure)",
        assumptions=(
            "Fuel-only. CAFE-II regulatory new-fleet mileage used as a proxy for 'typical car' "
            "in the absence of an on-road-fleet average -- likely underestimates real cost, "
            "since real-world mileage commonly runs 15-25% below rated figures. Excludes "
            "parking, tolls, maintenance, depreciation, surge pricing by design."
        ),
    ),
    "two_wheeler": CostFactor(
        mode="two_wheeler",
        cost_per_km_inr=round(_PETROL_PRICE_INR_PER_L / _TWO_WHEELER_KM_PER_L, 3),
        unit="INR/km",
        source=(
            f"Derived: petrol price / ~{_TWO_WHEELER_KM_PER_L:.1f} km/l, itself derived from "
            "the ICCT 41.2 gCO2/km fleet baseline via an implied petrol emission factor "
            "(2364.4 gCO2/L) back-derived from CAFE-II's own paired car figures"
        ),
        year="2026 (price) / FY2018-19 (fleet CO2 baseline)",
        assumptions="Two derivation steps stacked -- weaker provenance than car's, documented not hidden.",
    ),
    "cycling": CostFactor(
        mode="cycling",
        cost_per_km_inr=0.0,
        unit="INR/km",
        source="Definitional -- cycling consumes no fuel. Not an empirically sourced figure.",
        year="n/a",
        assumptions="Excludes maintenance/depreciation by design, consistent with car and two_wheeler.",
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
                route_geometry=route.geometry,
            )

        if route.distance_km is None or route.duration_min is None:
            return ModeMetrics(
                mode=route.mode, distance_km=route.distance_km, duration_min=route.duration_min,
                estimated_cost_inr=None, estimated_carbon_g=None, available=False,
                routing_source="unavailable", routing_disclosure=disclosure,
                route_geometry=route.geometry,
            )

        cost = round(route.distance_km * COST_FACTORS[route.mode].cost_per_km_inr, 2)
        carbon = round(route.distance_km * CARBON_FACTORS[route.mode].factor_gco2_per_km, 2)
        routing_source = "osrm-cache" if route.source == "cache" else "osrm-live"
        if route.source == "cache":
            cache_note = "Live OSRM was unreachable -- serving a pre-recorded route for this exact trip."
            disclosure = f"{disclosure} {cache_note}" if disclosure else cache_note
        return ModeMetrics(
            mode=route.mode, distance_km=route.distance_km, duration_min=route.duration_min,
            estimated_cost_inr=cost, estimated_carbon_g=carbon, available=True,
            routing_source=routing_source, routing_disclosure=disclosure,
            route_geometry=route.geometry,
        )
