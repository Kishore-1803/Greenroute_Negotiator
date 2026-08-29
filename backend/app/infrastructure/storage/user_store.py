"""
infrastructure/storage/user_store.py

Persistent User & Authentication repository backed by SQLAlchemy.
Uses PBKDF2 HMAC SHA-256 for secure password hashing.
"""

from __future__ import annotations

import hashlib
import json
import secrets
import uuid
from dataclasses import dataclass

from sqlalchemy.orm import sessionmaker

from app.infrastructure.database.models import User


@dataclass
class UserDTO:
    id: str
    email: str | None
    phone: str | None
    name: str
    location: str
    personality_tag: str
    preferred_modes: list[str]
    avatar_url: str | None = None
    created_at: str | None = None


def _hash_password(password: str, salt: str) -> str:
    """Derives a PBKDF2-HMAC-SHA256 hash using 100,000 iterations."""
    dk = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000
    )
    return dk.hex()


class SQLiteUserStore:
    def __init__(self, session_factory: sessionmaker):
        self._session_factory = session_factory
        
        # We assume tables are created via Base.metadata.create_all() elsewhere (e.g. main.py)
        # but just in case:
        from app.infrastructure.database.session import Base, engine
        Base.metadata.create_all(bind=engine)

    def create_user(
        self,
        identifier: str,
        password: str,
        name: str,
        location: str = "Chennai, TN",
        personality_tag: str = "Eco-Smart Daily Commuter",
        preferred_modes: list[str] | None = None,
    ) -> UserDTO:
        cleaned_identifier = identifier.strip().lower()
        is_email = "@" in cleaned_identifier
        
        salt = secrets.token_hex(16)
        pw_hash = _hash_password(password, salt)
        user_id = f"usr_{uuid.uuid4().hex[:12]}"
        modes_json = json.dumps(preferred_modes or ["car", "two_wheeler", "cycling"])

        with self._session_factory() as session:
            if is_email:
                existing = session.query(User).filter(User.email == cleaned_identifier).first()
            else:
                existing = session.query(User).filter(User.phone == cleaned_identifier).first()
                
            if existing:
                raise ValueError("An account with this identifier already exists.")

            new_user = User(
                id=user_id,
                email=cleaned_identifier if is_email else None,
                phone=None if is_email else cleaned_identifier,
                password_hash=pw_hash,
                salt=salt,
                name=name.strip(),
                location=location.strip(),
                personality_tag=personality_tag.strip(),
                preferred_modes=modes_json
            )
            session.add(new_user)
            session.commit()
            
            created_at_str = str(new_user.created_at) if new_user.created_at else None

        return UserDTO(
            id=user_id,
            email=cleaned_identifier if is_email else None,
            phone=None if is_email else cleaned_identifier,
            name=name.strip(),
            location=location.strip(),
            personality_tag=personality_tag.strip(),
            preferred_modes=preferred_modes or ["car", "two_wheeler", "cycling"],
            created_at=created_at_str
        )

    def authenticate(self, identifier: str, password: str) -> UserDTO | None:
        cleaned_identifier = identifier.strip().lower()
        is_email = "@" in cleaned_identifier
        
        with self._session_factory() as session:
            if is_email:
                user = session.query(User).filter(User.email == cleaned_identifier).first()
            else:
                user = session.query(User).filter(User.phone == cleaned_identifier).first()
                
            if not user:
                return None

            computed_hash = _hash_password(password, user.salt)
            if not secrets.compare_digest(user.password_hash, computed_hash):
                return None

            try:
                modes = json.loads(user.preferred_modes) if user.preferred_modes else ["car", "two_wheeler", "cycling"]
            except Exception:
                modes = ["car", "two_wheeler", "cycling"]

            return UserDTO(
                id=user.id,
                email=user.email,
                phone=user.phone,
                name=user.name,
                location=user.location or "Chennai, TN",
                personality_tag=user.personality_tag or "Eco-Smart Daily Commuter",
                preferred_modes=modes,
                avatar_url=user.avatar_url,
                created_at=str(user.created_at) if user.created_at else None,
            )

    def get_by_id(self, user_id: str) -> UserDTO | None:
        with self._session_factory() as session:
            user = session.query(User).filter(User.id == user_id).first()
            if not user:
                return None

            try:
                modes = json.loads(user.preferred_modes) if user.preferred_modes else ["car", "two_wheeler", "cycling"]
            except Exception:
                modes = ["car", "two_wheeler", "cycling"]

            return UserDTO(
                id=user.id,
                email=user.email,
                phone=user.phone,
                name=user.name,
                location=user.location or "Chennai, TN",
                personality_tag=user.personality_tag or "Eco-Smart Daily Commuter",
                preferred_modes=modes,
                avatar_url=user.avatar_url,
                created_at=str(user.created_at) if user.created_at else None,
            )

    def update_profile(
        self,
        user_id: str,
        name: str | None = None,
        location: str | None = None,
        personality_tag: str | None = None,
        preferred_modes: list[str] | None = None,
        avatar_url: str | None = None,
    ) -> UserDTO | None:
        with self._session_factory() as session:
            user = session.query(User).filter(User.id == user_id).first()
            if not user:
                return None

            if name is not None:
                user.name = name.strip()
            if location is not None:
                user.location = location.strip()
            if personality_tag is not None:
                user.personality_tag = personality_tag.strip()
            if preferred_modes is not None:
                user.preferred_modes = json.dumps(preferred_modes)
            if avatar_url is not None:
                user.avatar_url = avatar_url

            session.commit()
            
            return self.get_by_id(user_id)
