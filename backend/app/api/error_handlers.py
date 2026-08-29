"""
app/api/error_handlers.py

Maps the domain error taxonomy (app.domain.common.errors) to a consistent JSON error
envelope + HTTP status code. This is the ONLY place that knows the HTTP mapping -- the domain
and application layers never import fastapi or reference a status code.

No stack traces or infrastructure details ever reach the response body (Part N); unexpected
exceptions are logged with full detail server-side and returned as a generic 500.
"""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.domain.common.errors import (
    DecisionFailureError,
    EnrichmentUnavailableError,
    ExplanationProviderFailureError,
    NegotiationProviderFailureError,
    RouteNotFoundError,
    RoutingUnavailableError,
    TripNotFoundError,
    ValidationError,
)
from app.schemas.common import ErrorEnvelope

logger = logging.getLogger(__name__)

_STATUS_BY_ERROR = {
    ValidationError: 400,
    TripNotFoundError: 404,
    RouteNotFoundError: 502,
    RoutingUnavailableError: 502,
    EnrichmentUnavailableError: 500,
    DecisionFailureError: 500,
    ExplanationProviderFailureError: 502,
    # Defense in depth: RunNegotiationUseCase.execute always catches this and falls back to the
    # deterministic provider today, so this mapping is not on the live path -- but if that
    # internal catch is ever removed, an unhandled NegotiationProviderFailureError should surface
    # as a distinguishable 502 (bad upstream dependency), not an opaque generic 500.
    NegotiationProviderFailureError: 502,
}


def _envelope(exc: Exception, status_code: int) -> JSONResponse:
    request_id = getattr(exc, "_request_id", None)
    body = ErrorEnvelope(error_code=type(exc).__name__, message=str(exc), request_id=request_id)
    return JSONResponse(status_code=status_code, content=body.model_dump())


def register_error_handlers(app: FastAPI) -> None:
    for error_type, status_code in _STATUS_BY_ERROR.items():

        def _handler(request: Request, exc: Exception, _status=status_code):
            logger.warning("handled domain error", extra={"error_type": type(exc).__name__, "path": request.url.path})
            return _envelope(exc, _status)

        app.add_exception_handler(error_type, _handler)

    def _unhandled(request: Request, exc: Exception):
        logger.exception("unhandled exception", extra={"path": request.url.path})
        return _envelope(Exception("internal error"), 500)

    app.add_exception_handler(Exception, _unhandled)
