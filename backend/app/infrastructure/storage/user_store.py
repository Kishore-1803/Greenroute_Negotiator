"""
infrastructure/storage/user_store.py

Persistent User & Authentication repository backed by SQLite.
Uses PBKDF2 HMAC SHA-256 for secure password hashing.
"""

from __future__ import annotations

import contextlib
import hashlib
import json
import os
import secrets
import sqlite3
import threading
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Optional


@dataclass
class UserDTO:
    id: str
    email: str
    name: str
    location: str
    personality_tag: str
    preferred_modes: list[str]
    avatar_url: Optional[str] = None
    created_at: Optional[str] = None


_SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    name TEXT NOT NULL,
    location TEXT DEFAULT 'Chennai, TN',
    personality_tag TEXT DEFAULT 'Eco-Smart Daily Commuter',
    preferred_modes TEXT DEFAULT '["car", "two_wheeler", "cycling"]',
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
"""


def _hash_password(password: str, salt: str) -> str:
    """Derives a PBKDF2-HMAC-SHA256 hash using 100,000 iterations."""
    dk = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000
    )
    return dk.hex()


class SQLiteUserStore:
    def __init__(self, db_path: str | Path):
        self._db_path = str(db_path)
        self._lock = threading.Lock()

        # Ensure directory & table exist
        Path(self._db_path).parent.mkdir(parents=True, exist_ok=True)
        with contextlib.closing(self._connect()) as conn, conn:
            conn.execute(_SCHEMA)

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path, check_same_thread=False)
        conn.execute("PRAGMA journal_mode=WAL;")
        return conn

    def create_user(
        self,
        email: str,
        password: str,
        name: str,
        location: str = "Chennai, TN",
        personality_tag: str = "Eco-Smart Daily Commuter",
        preferred_modes: list[str] | None = None,
    ) -> UserDTO:
        cleaned_email = email.strip().lower()
        salt = secrets.token_hex(16)
        pw_hash = _hash_password(password, salt)
        user_id = f"usr_{uuid.uuid4().hex[:12]}"
        modes_json = json.dumps(preferred_modes or ["car", "two_wheeler", "cycling"])

        with self._lock, contextlib.closing(self._connect()) as conn, conn:
            # Check existing email
            existing = conn.execute(
                "SELECT id FROM users WHERE email = ?", (cleaned_email,)
            ).fetchone()
            if existing:
                raise ValueError("An account with this email already exists.")

            conn.execute(
                """INSERT INTO users (
                       id, email, password_hash, salt, name, 
                       location, personality_tag, preferred_modes
                   ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (user_id, cleaned_email, pw_hash, salt, name.strip(), location.strip(), personality_tag.strip(), modes_json),
            )

        return UserDTO(
            id=user_id,
            email=cleaned_email,
            name=name.strip(),
            location=location.strip(),
            personality_tag=personality_tag.strip(),
            preferred_modes=preferred_modes or ["car", "two_wheeler", "cycling"],
        )

    def authenticate(self, email: str, password: str) -> Optional[UserDTO]:
        cleaned_email = email.strip().lower()
        with self._lock, contextlib.closing(self._connect()) as conn:
            row = conn.execute(
                """SELECT id, email, password_hash, salt, name, location, 
                          personality_tag, preferred_modes, avatar_url, created_at
                   FROM users WHERE email = ?""",
                (cleaned_email,),
            ).fetchone()

            if not row:
                return None

            user_id, u_email, stored_hash, salt, name, loc, p_tag, modes_raw, avatar, created_at = row
            computed_hash = _hash_password(password, salt)

            if not secrets.compare_digest(stored_hash, computed_hash):
                return None

            try:
                modes = json.loads(modes_raw) if modes_raw else ["car", "two_wheeler", "cycling"]
            except Exception:
                modes = ["car", "two_wheeler", "cycling"]

            return UserDTO(
                id=user_id,
                email=u_email,
                name=name,
                location=loc or "Chennai, TN",
                personality_tag=p_tag or "Eco-Smart Daily Commuter",
                preferred_modes=modes,
                avatar_url=avatar,
                created_at=created_at,
            )

    def get_by_id(self, user_id: str) -> Optional[UserDTO]:
        with self._lock, contextlib.closing(self._connect()) as conn:
            row = conn.execute(
                """SELECT id, email, name, location, personality_tag, 
                          preferred_modes, avatar_url, created_at
                   FROM users WHERE id = ?""",
                (user_id,),
            ).fetchone()

            if not row:
                return None

            u_id, email, name, loc, p_tag, modes_raw, avatar, created_at = row
            try:
                modes = json.loads(modes_raw) if modes_raw else ["car", "two_wheeler", "cycling"]
            except Exception:
                modes = ["car", "two_wheeler", "cycling"]

            return UserDTO(
                id=u_id,
                email=email,
                name=name,
                location=loc or "Chennai, TN",
                personality_tag=p_tag or "Eco-Smart Daily Commuter",
                preferred_modes=modes,
                avatar_url=avatar,
                created_at=created_at,
            )

    def update_profile(
        self,
        user_id: str,
        name: Optional[str] = None,
        location: Optional[str] = None,
        personality_tag: Optional[str] = None,
        preferred_modes: Optional[list[str]] = None,
        avatar_url: Optional[str] = None,
    ) -> Optional[UserDTO]:
        with self._lock, contextlib.closing(self._connect()) as conn, conn:
            current = self.get_by_id(user_id)
            if not current:
                return None

            new_name = name.strip() if name is not None else current.name
            new_loc = location.strip() if location is not None else current.location
            new_tag = personality_tag.strip() if personality_tag is not None else current.personality_tag
            new_modes = preferred_modes if preferred_modes is not None else current.preferred_modes
            new_avatar = avatar_url if avatar_url is not None else current.avatar_url

            conn.execute(
                """UPDATE users 
                   SET name = ?, location = ?, personality_tag = ?, 
                       preferred_modes = ?, avatar_url = ?
                   WHERE id = ?""",
                (new_name, new_loc, new_tag, json.dumps(new_modes), new_avatar, user_id),
            )

        return self.get_by_id(user_id)
