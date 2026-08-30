"""app/api/auth.py -- Authentication utilities"""

from datetime import UTC, datetime, timedelta

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.api.dependencies import get_user_store
from app.infrastructure.config.settings import get_settings
from app.infrastructure.storage.user_store import SQLAlchemyUserStore, UserDTO

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 1 week

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
# auto_error=False: this variant is for endpoints that work for both guests and logged-in
# users (e.g. trip planning) -- a missing/invalid token should fall through to the anonymous
# path, not 401. Endpoints that require a session still use oauth2_scheme/get_current_user.
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, get_settings().jwt_secret_key, algorithm=ALGORITHM)
    return encoded_jwt


def _decode_user_id(token: str) -> str | None:
    try:
        payload = jwt.decode(token, get_settings().jwt_secret_key, algorithms=[ALGORITHM])
    except jwt.InvalidTokenError:
        return None
    return payload.get("sub")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    user_store: SQLAlchemyUserStore = Depends(get_user_store)
) -> UserDTO:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    user_id = _decode_user_id(token)
    if user_id is None:
        raise credentials_exception

    user = user_store.get_by_id(user_id)
    if user is None:
        raise credentials_exception
    return user


async def get_current_user_optional(
    token: str | None = Depends(oauth2_scheme_optional),
    user_store: SQLAlchemyUserStore = Depends(get_user_store),
) -> UserDTO | None:
    """Same identity resolution as get_current_user, but returns None instead of raising when
    there is no token or it doesn't resolve to a real user -- lets an endpoint prefer the
    authenticated identity when one is present without forcing a login for anonymous/demo use."""
    if not token:
        return None
    user_id = _decode_user_id(token)
    if user_id is None:
        return None
    return user_store.get_by_id(user_id)
