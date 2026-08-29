"""
domain/common/errors.py

Application-wide error taxonomy. Pure Python -- no FastAPI, no HTTP status codes here (that
mapping belongs to app/api/error_handlers.py). The domain and application layers raise these;
only the API layer knows how to translate them into a response.
"""

from __future__ import annotations


class GreenRouteError(Exception):
    """Base class for every error this application raises deliberately (as opposed to an
    unexpected bug, which should surface as a plain unhandled exception -> 500)."""


class ValidationError(GreenRouteError):
    """Caller supplied invalid input (e.g. current_mode not in the tracked set)."""


class RoutingUnavailableError(GreenRouteError):
    """The routing provider (OSRM or otherwise) could not be reached at all."""


class RouteNotFoundError(GreenRouteError):
    """The routing provider was reachable but returned no usable route for a mode."""


class EnrichmentUnavailableError(GreenRouteError):
    """A required cost/carbon factor is missing for a mode -- never fabricate a number."""


class DecisionFailureError(GreenRouteError):
    """The utility/switch engine could not produce a decision (e.g. zero usable modes)."""


class ExplanationProviderFailureError(GreenRouteError):
    """The configured ExplanationProvider failed or returned an unsupported/invalid output."""


class NegotiationProviderFailureError(GreenRouteError):
    """The configured NegotiationProvider failed (network/parse/Groq error) -- distinct from a
    validation rejection, which is raised as the domain.negotiation errors instead."""


class TripNotFoundError(GreenRouteError):
    """No trip exists for the given trip_id (in-memory store, no DB in this MVP)."""
