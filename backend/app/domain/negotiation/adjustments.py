"""
domain/negotiation/adjustments.py

The specialist agents' MATERIAL contribution to the decision: each agent proposes a structured
{mode, channel, delta, reason} adjustment to the raw routing/enrichment metrics, the proposals
are resolved (summed per channel, then clamped), and compute_utility_scores runs on the
ADJUSTED metrics. Deleting an agent therefore changes the utility scores -- and, when the
adjusted ranking crosses, changes the recommendation itself.

WHY THE ADJUSTMENTS ARE DETERMINISTIC, NOT LLM-CHOSEN
-----------------------------------------------------
The numbers below are computed here, in the framework-free domain layer, from the raw metrics
plus an explicit caller-supplied AQI. An LLM never picks them. That keeps three properties the
rest of this codebase depends on:

  1. The recommendation is reproducible -- the same trip always scores the same way.
  2. A Groq outage cannot change the winner. The deterministic negotiation fallback and a live
     Groq transcript narrate the SAME adjusted ranking, so "degrades honestly" stays true.
  3. domain.negotiation.interfaces.validate_transcript stays meaningful: the Coordinator still
     may not declare a winner other than the computed one, and that computed winner is still
     the output of pure Python arithmetic.

The agents are load-bearing on the DATA, not on the arithmetic. That is the deliberate line.

WHY THESE PARTICULAR ADJUSTMENTS
--------------------------------
Each rule corrects an omission that infrastructure/enrichment/static_factors.py DOCUMENTS in
its own docstrings -- these are not invented fudge factors:

  speed  -> duration_min:       OSRM returns in-vehicle travel time only. Door-to-door time
                                also includes parking search and the walk from the parking
                                space, which differs sharply by mode.
  cost   -> estimated_cost_inr: static_factors' CostFactor.assumptions says, verbatim,
                                "Excludes parking, tolls, maintenance, depreciation by design."
                                This restores a marginal-ownership share of that exclusion.
  carbon -> estimated_carbon_g: an AQI exposure proxy. Ambient pollution harms a traveller in
                                proportion to their ventilation rate and outdoor exposure, which
                                an enclosed car mitigates and hard cycling amplifies. Applied
                                ONLY when the caller supplies an aqi -- absent, this channel
                                contributes nothing rather than inventing an air-quality number.

Every constant carries its own reasoning inline. Adjustments are bounded (see _cap_for) so no
single channel can dominate the formula, and no adjusted value may go negative.

This module imports ONLY app.domain.* -- no FastAPI, no Groq, no OSRM, no httpx, no DB.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.domain.decision.entities import ModeMetrics

AGENT_ROLES = ("speed", "cost", "carbon", "weather")

# Which single metric each agent is allowed to touch -- the 1:1 channel mapping. An agent may
# never write outside its own channel, which is what keeps the three contributions separable
# and the ablation interpretable.
AGENT_CHANNEL: dict[str, str] = {
    "speed": "duration_min",
    "cost": "estimated_cost_inr",
    "carbon": "estimated_carbon_g",
    "weather": "duration_min",
}

# --- speed agent -------------------------------------------------------------------------
# Access-and-egress minutes added to OSRM's in-vehicle time. Ordered by how much parking
# friction each mode actually faces in an Indian urban core; magnitudes are conservative
# relative to the 3-8 min urban parking-search range commonly reported in transport surveys.
ACCESS_EGRESS_MIN: dict[str, float] = {
    "car": 4.0,          # parking search + walk from the space to the door
    "two_wheeler": 1.5,  # parks close to the entrance, negligible search
    "cycling": 0.5,      # lock up at a rack at the destination
}

# --- cost agent --------------------------------------------------------------------------
# Multiplicative uplift restoring a marginal share of the parking/tolls/maintenance/
# depreciation that static_factors.py deliberately excludes from its fuel-only figures.
OWNERSHIP_UPLIFT: dict[str, float] = {
    "car": 0.60,          # +60% -- parking fees dominate; also tolls, tyres, servicing
    "two_wheeler": 0.35,  # +35% -- far cheaper parking, cheaper servicing
    "cycling": 0.0,       # no ownership uplift; a flat wear cost is added below instead
}
# Cycling's fuel-only cost is 0.0, so a multiplicative uplift would be identically zero and the
# mode would read as literally free. This flat per-trip figure stands in for tyre/chain/brake
# wear so "cheapest" stays an honest comparison rather than an artifact of a zero baseline.
CYCLING_WEAR_INR = 1.0

# --- carbon agent ------------------------------------------------------------------------
# Per-mode pollution exposure coefficients, relative to a moderately-exerting outdoor traveller.
# A car cabin offers partial filtration and no elevated breathing; cycling raises ventilation
# rate substantially while fully outdoors.
AQI_EXPOSURE_COEFF: dict[str, float] = {
    "car": 0.15,
    "two_wheeler": 0.80,
    "cycling": 1.30,
}
AQI_CLEAN_BASELINE = 50.0   # AQI at/below which no exposure penalty applies ("good" air)
AQI_SEVERE = 250.0          # AQI at which the exposure factor reaches 1.0
AQI_FACTOR_CAP = 1.5        # hard ceiling so an extreme AQI cannot unbound the channel

# --- weather agent -----------------------------------------------------------------------
# Time penalty applied to open modes during rain to account for slower, cautious riding and 
# the time taken to put on/take off rain gear.
WEATHER_DELAY_MIN: dict[str, float] = {
    "car": 0.0,
    "two_wheeler": 15.0,
    "cycling": 10.0,
}

# --- resolution bounds -------------------------------------------------------------------
# Round 2 resolves competing proposals by SUMMING the per-(mode, channel) deltas and then
# clamping. The clamp is the larger of a relative cap and a per-channel absolute floor: the
# relative cap keeps a big baseline from being swamped, while the absolute floor keeps a
# near-zero baseline (cycling's 0.0 cost) from making every adjustment mathematically
# impossible.
MAX_RELATIVE_ADJUSTMENT = 0.60
MIN_ABSOLUTE_CAP: dict[str, float] = {
    "duration_min": 5.0,
    "estimated_cost_inr": 3.0,
    "estimated_carbon_g": 50.0,
}


@dataclass(frozen=True)
class ModeAdjustment:
    """One agent's Round 1 proposal against one mode's one channel."""
    agent: str
    mode: str
    channel: str
    delta: float  # additive, in the channel's own unit; may be negative
    reason: str


@dataclass(frozen=True)
class ResolvedAdjustment:
    """The Round 2 outcome for one (mode, channel): what was proposed, what survived the clamp."""
    mode: str
    channel: str
    proposed_delta: float
    applied_delta: float
    was_clamped: bool
    baseline_value: float
    adjusted_value: float


@dataclass(frozen=True)
class AdjustmentOutcome:
    proposals: tuple[ModeAdjustment, ...]
    resolved: tuple[ResolvedAdjustment, ...]
    agents_active: tuple[str, ...]

    def as_dict(self) -> dict:
        return {
            "agents_active": list(self.agents_active),
            "proposals": [
                {"agent": p.agent, "mode": p.mode, "channel": p.channel,
                 "delta": round(p.delta, 4), "reason": p.reason}
                for p in self.proposals
            ],
            "resolved": [
                {"mode": r.mode, "channel": r.channel,
                 "proposed_delta": round(r.proposed_delta, 4),
                 "applied_delta": round(r.applied_delta, 4),
                 "was_clamped": r.was_clamped,
                 "baseline_value": round(r.baseline_value, 4),
                 "adjusted_value": round(r.adjusted_value, 4)}
                for r in self.resolved
            ],
        }


def _usable(m: ModeMetrics) -> bool:
    """Only modes that actually routed can be adjusted -- an unavailable mode has None metrics
    and must stay untouched so compute_utility_scores still excludes it for the real reason."""
    return (
        m.available
        and m.duration_min is not None
        and m.estimated_cost_inr is not None
        and m.estimated_carbon_g is not None
    )


def aqi_factor(aqi: float | None) -> float:
    """0.0 at or below clean-baseline AQI, 1.0 at severe AQI, linear between, capped."""
    if aqi is None:
        return 0.0
    if aqi <= AQI_CLEAN_BASELINE:
        return 0.0
    factor = (aqi - AQI_CLEAN_BASELINE) / (AQI_SEVERE - AQI_CLEAN_BASELINE)
    return min(factor, AQI_FACTOR_CAP)


def _speed_proposals(metrics: dict[str, ModeMetrics]) -> list[ModeAdjustment]:
    out = []
    for mode in metrics:
        minutes = ACCESS_EGRESS_MIN.get(mode)
        if minutes is None:
            continue
        out.append(
            ModeAdjustment(
                agent="speed", mode=mode, channel="duration_min", delta=minutes,
                reason=(
                    f"OSRM reports in-vehicle time only; {mode} additionally needs ~{minutes:g} min "
                    f"of parking search and walk-from-space to be a door-to-door figure."
                ),
            )
        )
    return out


def _cost_proposals(metrics: dict[str, ModeMetrics]) -> list[ModeAdjustment]:
    out = []
    for mode, m in metrics.items():
        if mode == "cycling":
            out.append(
                ModeAdjustment(
                    agent="cost", mode=mode, channel="estimated_cost_inr", delta=CYCLING_WEAR_INR,
                    reason=(
                        f"Fuel-only cost for cycling is 0.0, which reads as literally free; "
                        f"Rs.{CYCLING_WEAR_INR:g} stands in for per-trip tyre/chain/brake wear."
                    ),
                )
            )
            continue
        uplift = OWNERSHIP_UPLIFT.get(mode)
        if uplift is None:
            continue
        delta = m.estimated_cost_inr * uplift
        out.append(
            ModeAdjustment(
                agent="cost", mode=mode, channel="estimated_cost_inr", delta=delta,
                reason=(
                    f"static_factors excludes parking, tolls, maintenance and depreciation by design; "
                    f"+{uplift:.0%} restores a marginal ownership share for {mode}."
                ),
            )
        )
    return out


def _carbon_proposals(metrics: dict[str, ModeMetrics], aqi: float | None) -> list[ModeAdjustment]:
    factor = aqi_factor(aqi)
    if factor <= 0.0:
        # No AQI supplied (or air is clean): contribute nothing rather than invent a number.
        return []
    out = []
    for mode, m in metrics.items():
        coeff = AQI_EXPOSURE_COEFF.get(mode)
        if coeff is None:
            continue
        delta = m.estimated_carbon_g * factor * coeff
        out.append(
            ModeAdjustment(
                agent="carbon", mode=mode, channel="estimated_carbon_g", delta=delta,
                reason=(
                    f"At AQI {aqi:g}, pollution exposure scales with ventilation rate and outdoor "
                    f"time; {mode} carries an exposure coefficient of {coeff:g}."
                ),
            )
        )
    return out


def _weather_proposals(metrics: dict[str, ModeMetrics], weather: dict | None) -> list[ModeAdjustment]:
    if not weather or not weather.get("is_raining"):
        return []
        
    out = []
    for mode in metrics.keys():
        delay = WEATHER_DELAY_MIN.get(mode, 0.0)
        if delay <= 0:
            continue
        out.append(
            ModeAdjustment(
                agent="weather", mode=mode, channel="duration_min", delta=delay,
                reason=(
                    f"It is currently raining ({weather.get('description', 'Rain')}). "
                    f"Adding {delay:g} min to {mode} for cautious riding and rain gear."
                ),
            )
        )
    return out


_PROPOSERS = {"speed": _speed_proposals, "cost": _cost_proposals, "carbon": _carbon_proposals, "weather": _weather_proposals}


def _cap_for(channel: str, baseline_value: float) -> float:
    return max(MAX_RELATIVE_ADJUSTMENT * abs(baseline_value), MIN_ABSOLUTE_CAP.get(channel, 0.0))


def propose_adjustments(
    metrics: dict[str, ModeMetrics],
    aqi: float | None = None,
    active_agents: tuple[str, ...] = AGENT_ROLES,
) -> list[ModeAdjustment]:
    """Round 1: every active specialist independently proposes against its own channel.

    `active_agents` is what makes the ablation a real experiment rather than an assertion --
    pass a subset (or ()) to run the pipeline as if those specialists did not exist."""
    usable = {mode: m for mode, m in metrics.items() if _usable(m)}
    proposals: list[ModeAdjustment] = []
    for agent in active_agents:
        proposer = _PROPOSERS.get(agent)
        if proposer is None:
            continue
        if agent == "carbon":
            proposals.extend(_carbon_proposals(usable, aqi))
        elif agent == "weather":
            # We will pass weather explicitly below
            pass
        else:
            proposals.extend(proposer(usable))
    return proposals


def resolve_and_apply(
    metrics: dict[str, ModeMetrics],
    proposals: list[ModeAdjustment],
    active_agents: tuple[str, ...] = AGENT_ROLES,
) -> tuple[dict[str, ModeMetrics], AdjustmentOutcome]:
    """Round 2: sum the proposals per (mode, channel), clamp, and apply to produce the metrics
    compute_utility_scores will actually consume.

    Summing (rather than letting a later agent overwrite an earlier one) is what makes this
    order-independent: no proposal is silently discarded, and the clamp caps the total blast
    radius per channel rather than per agent."""
    totals: dict[tuple[str, str], float] = {}
    for p in proposals:
        totals[(p.mode, p.channel)] = totals.get((p.mode, p.channel), 0.0) + p.delta

    resolved: list[ResolvedAdjustment] = []
    adjusted: dict[str, ModeMetrics] = {}

    for mode, m in metrics.items():
        if not _usable(m):
            adjusted[mode] = m
            continue

        current = {
            "duration_min": m.duration_min,
            "estimated_cost_inr": m.estimated_cost_inr,
            "estimated_carbon_g": m.estimated_carbon_g,
        }
        new_values = dict(current)

        for channel, baseline_value in current.items():
            proposed = totals.get((mode, channel), 0.0)
            if proposed == 0.0:
                continue
            cap = _cap_for(channel, baseline_value)
            applied = max(-cap, min(cap, proposed))
            # A negative metric is meaningless (and would break min-max normalization), so the
            # floor is 0.0 regardless of what the clamp allowed.
            new_value = max(0.0, baseline_value + applied)
            new_values[channel] = new_value
            resolved.append(
                ResolvedAdjustment(
                    mode=mode, channel=channel,
                    proposed_delta=proposed, applied_delta=applied,
                    was_clamped=applied != proposed,
                    baseline_value=baseline_value, adjusted_value=new_value,
                )
            )

        adjusted[mode] = ModeMetrics(
            mode=m.mode,
            distance_km=m.distance_km,
            duration_min=round(new_values["duration_min"], 3),
            estimated_cost_inr=round(new_values["estimated_cost_inr"], 2),
            estimated_carbon_g=round(new_values["estimated_carbon_g"], 2),
            available=m.available,
            routing_source=m.routing_source,
            routing_disclosure=m.routing_disclosure,
            route_geometry=m.route_geometry,
            stops=m.stops,
            traffic_segments=m.traffic_segments,
        )

    outcome = AdjustmentOutcome(
        proposals=tuple(proposals),
        resolved=tuple(resolved),
        agents_active=tuple(active_agents),
    )
    return adjusted, outcome


def apply_agent_adjustments(
    metrics: dict[str, ModeMetrics],
    aqi: float | None = None,
    weather: dict | None = None,
    active_agents: tuple[str, ...] = AGENT_ROLES,
) -> tuple[dict[str, ModeMetrics], AdjustmentOutcome]:
    """Round 1 + Round 2 in one call -- the entry point the application layer uses."""
    proposals = propose_adjustments(metrics, aqi=aqi, active_agents=active_agents)
    if "weather" in active_agents:
        proposals.extend(_weather_proposals({mode: m for mode, m in metrics.items() if m.available}, weather))
    return resolve_and_apply(metrics, proposals, active_agents=active_agents)
