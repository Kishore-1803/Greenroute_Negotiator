from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.infrastructure.storage.impact_store import UserImpactStats
from app.api.dependencies import get_impact_store
from app.infrastructure.storage.impact_store import SQLiteImpactStore

router = APIRouter(prefix="/api/v1/users", tags=["users"])

@router.get("/{user_id}/impact", response_model=UserImpactStats)
async def user_impact(
    user_id: str,
    impact_store: SQLiteImpactStore = Depends(get_impact_store),
) -> UserImpactStats:
    return impact_store.get_user_impact(user_id)
