"""app/api/routers/health.py -- HTTP translation only, per the Modularity Rule."""

from __future__ import annotations

from fastapi import APIRouter

from app.infrastructure.config.settings import get_settings
from app.schemas.responses import HealthResponse

router = APIRouter(prefix="/api/v1", tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    settings = get_settings()
    return HealthResponse(status="ok", environment=settings.environment)
