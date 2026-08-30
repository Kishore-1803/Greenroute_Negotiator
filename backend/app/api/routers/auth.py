from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.auth import create_access_token
from app.api.dependencies import get_user_store
from app.infrastructure.storage.user_store import SQLAlchemyUserStore, UserDTO
from app.schemas.requests import LoginRequest, SignUpRequest

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserDTO

@router.post("/signup", response_model=TokenResponse)
async def signup(
    body: SignUpRequest,
    user_store: SQLAlchemyUserStore = Depends(get_user_store)
):
    try:
        user = user_store.create_user(
            identifier=body.identifier,
            password=body.password,
            name=body.name,
            location=body.location or "Chennai, TN",
            personality_tag=body.personality_tag or "Eco-Smart Daily Commuter"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    access_token = create_access_token(data={"sub": user.id})
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    user_store: SQLAlchemyUserStore = Depends(get_user_store)
):
    user = user_store.authenticate(body.identifier, body.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.id})
    return {"access_token": access_token, "token_type": "bearer", "user": user}
