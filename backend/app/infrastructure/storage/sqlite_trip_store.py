"""
infrastructure/storage/sqlite_trip_store.py

Persistent Trip repository backed by SQLite.
"""

from __future__ import annotations

import contextlib
import sqlite3
import threading
from pathlib import Path

from pydantic import TypeAdapter

from app.application.services.trip_store import TripStore
from app.domain.common.errors import TripNotFoundError
from app.domain.decision.entities import Trip

_SCHEMA = """
CREATE TABLE IF NOT EXISTS trips (
    trip_id TEXT PRIMARY KEY,
    user_id TEXT,
    data TEXT NOT NULL
);
"""


class SQLiteTripStore(TripStore):
    def __init__(self, db_path: str | Path):
        self._db_path = str(db_path)
        self._lock = threading.Lock()
        self._adapter = TypeAdapter(Trip)
        
        # Ensure the table exists on startup
        with contextlib.closing(self._connect()) as conn, conn:
            conn.execute(_SCHEMA)

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path, check_same_thread=False)
        conn.execute("PRAGMA journal_mode=WAL;")
        return conn

    def save(self, trip: Trip) -> None:
        data_json = self._adapter.dump_json(trip).decode("utf-8")
        with self._lock, contextlib.closing(self._connect()) as conn, conn:
            conn.execute(
                """INSERT INTO trips (trip_id, user_id, data)
                   VALUES (?, ?, ?)
                   ON CONFLICT(trip_id) DO UPDATE SET
                       user_id = excluded.user_id,
                       data = excluded.data""",
                (trip.trip_id, trip.user_id, data_json),
            )

    def get(self, trip_id: str) -> Trip:
        with self._lock, contextlib.closing(self._connect()) as conn, conn:
            row = conn.execute(
                "SELECT data FROM trips WHERE trip_id = ?",
                (trip_id,),
            ).fetchone()
            
            if row is None:
                raise TripNotFoundError(f"unknown trip_id {trip_id!r}")
                
            data_json = row[0]
            return self._adapter.validate_json(data_json)
