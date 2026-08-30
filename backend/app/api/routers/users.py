
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.auth import get_current_user
from app.api.dependencies import get_impact_store, get_user_store
from app.infrastructure.storage.impact_store import (
    JourneyRecordDTO,
    SQLiteImpactStore,
    UserImpactStats,
)
from app.infrastructure.storage.user_store import UserDTO, SQLAlchemyUserStore
from app.schemas.requests import UpdateProfileRequest

router = APIRouter(prefix="/api/v1/users", tags=["users"])

class UserProfileResponse(BaseModel):
    user: UserDTO
    impact: UserImpactStats

@router.get("/me", response_model=UserProfileResponse)
async def get_my_profile(
    current_user: UserDTO = Depends(get_current_user),
    impact_store: SQLiteImpactStore = Depends(get_impact_store),
):
    impact = impact_store.get_user_impact(current_user.id)
    return UserProfileResponse(user=current_user, impact=impact)

@router.put("/me", response_model=UserProfileResponse)
async def update_my_profile(
    body: UpdateProfileRequest,
    current_user: UserDTO = Depends(get_current_user),
    user_store: SQLAlchemyUserStore = Depends(get_user_store),
    impact_store: SQLiteImpactStore = Depends(get_impact_store),
):
    updated_user = user_store.update_profile(
        user_id=current_user.id,
        name=body.name,
        location=body.location,
        personality_tag=body.personality_tag,
        preferred_modes=body.preferred_modes,
        avatar_url=body.avatar_base64,
    )
    if not updated_user:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="User not found")
        
    impact = impact_store.get_user_impact(current_user.id)
    return UserProfileResponse(user=updated_user, impact=impact)

@router.get("/me/history", response_model=list[JourneyRecordDTO])
async def get_my_history(
    current_user: UserDTO = Depends(get_current_user),
    impact_store: SQLiteImpactStore = Depends(get_impact_store),
):
    return impact_store.get_user_history(current_user.id)

@router.get("/{user_id}/impact", response_model=UserImpactStats)
async def user_impact(
    user_id: str,
    impact_store: SQLiteImpactStore = Depends(get_impact_store),
) -> UserImpactStats:
    return impact_store.get_user_impact(user_id)
