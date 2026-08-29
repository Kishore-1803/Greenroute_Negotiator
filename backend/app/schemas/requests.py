"""app/schemas/requests.py -- inbound DTOs."""

from __future__ import annotations

from pydantic import BaseModel, Field


class BaselineRequest(BaseModel):
    # Bounds validated here (basic format/range checking belongs at the API boundary, Part E);
    # whether a coordinate makes sense for OSRM to route (e.g. lands in the water) is a
    # business-rule/routing concern, left to RoutingUnavailableError/RouteNotFoundError.
    origin_lon: float = Field(ge=-180, le=180)
    origin_lat: float = Field(ge=-90, le=90)
    dest_lon: float = Field(ge=-180, le=180)
    dest_lat: float = Field(ge=-90, le=90)
    current_mode: str | None = Field(
        default=None,
        description=(
            'One of "car", "two_wheeler", "cycling". OPTIONAL: a brand-new trip (Master Plan '
            "primary flow) has no current mode yet -- omit it and the response's best_mode is "
            "the recommendation. Only meaningful once you go on to use the advanced condition-"
            "change/SWITCH-STAY flow, which needs a mode to evaluate switching away from."
        ),
    )
    user_id: str = Field(min_length=1, description="Stable per-caller identity Preference Memory learns weights against")
    stated_priority: str | None = Field(
        default=None,
        description=(
            'Cold-start preset for a first-time user_id -- one of "speed", "cost", "carbon", "balanced". '
            "Ignored for a user_id that already has a learned preference row, and ignored entirely "
            "if custom_weights is supplied."
        ),
    )
    custom_weights: dict[str, float] | None = Field(
        default=None,
        description=(
            'Master Plan "Preference Slider": an explicit {"time": .., "cost": .., "carbon": ..} '
            "weight vector for THIS baseline call only, normalized server-side to sum to 1. Takes "
            "precedence over both stated_priority and any learned Preference Memory vector for the "
            "utility computation, but is not itself persisted -- only an actual mode selection that "
            "differs from the recommendation moves the learned vector."
        ),
    )


class SelectionRequest(BaseModel):
    selected_mode: str = Field(description='One of "car", "two_wheeler", "cycling" -- the mode the user actually picked')


class ExplanationRequest(BaseModel):
    objection_category: str | None = Field(
        default=None,
        description=(
            "One of: why_switch, why_stay, what_changed, is_traffic_real, are_emissions_exact, "
            "why_this_mode, unsupported_constraint. Omit for the initial explanation."
        ),
    )
    objection_text: str | None = Field(
        default=None, description="Raw user text, only meaningful when objection_category='unsupported_constraint'"
    )
