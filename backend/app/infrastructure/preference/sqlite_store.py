"""
infrastructure/preference/sqlite_store.py

SQLite-backed PreferenceStore (Master Plan Section 3, Venkatram KS: "Architects the SQLite
database, online weight update rule math, and cold-start presets for new users"). One table,
one file, WAL mode so a demo doesn't hit "database is locked" under concurrent requests.

The Master Plan's own contract snippet (Section 5's Basic Code Snippet) clamps with
max(0.01, ...) even though the prose above it says "max(0, ...)" -- this implementation
follows the code snippet: a hard 0 would let one contrary choice zero out a dimension
permanently (0 * anything stays 0 under this additive rule) and risks a zero-sum
renormalization if all three hit floor simultaneously. 0.01 keeps every dimension
recoverable and the renormalization denominator always positive.
"""

from __future__ import annotations

import contextlib
import sqlite3
import threading
from pathlib import Path

from app.domain.preference.entities import COLD_START_PRESETS, UserPreference

_SCHEMA = """
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id TEXT PRIMARY KEY,
    w_time REAL NOT NULL,
    w_cost REAL NOT NULL,
    w_carbon REAL NOT NULL,
    trip_count INTEGER NOT NULL DEFAULT 0
);
"""

MIN_WEIGHT = 0.01


class SQLitePreferenceStore:
    def __init__(self, db_path: str | Path):
        self._db_path = str(db_path)
        self._lock = threading.Lock()
        with contextlib.closing(self._connect()) as conn, conn:
            conn.execute(_SCHEMA)

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path, check_same_thread=False)
        conn.execute("PRAGMA journal_mode=WAL;")
        return conn

    def get_or_create(self, user_id: str, stated_priority: str | None) -> UserPreference:
        # `with conn:` only wraps the transaction (commit/rollback) -- sqlite3.Connection's
        # context manager does NOT close the connection, so every call must close it itself
        # or the process leaks a file handle per call (found via a smoke test failing to
        # delete its own temp db file on Windows because the handle was still open).
        with self._lock, contextlib.closing(self._connect()) as conn, conn:
            row = conn.execute(
                "SELECT w_time, w_cost, w_carbon, trip_count FROM user_preferences WHERE user_id = ?",
                (user_id,),
            ).fetchone()
            if row is not None:
                w_time, w_cost, w_carbon, trip_count = row
                return UserPreference(user_id, w_time, w_cost, w_carbon, trip_count)

            preset = COLD_START_PRESETS.get(stated_priority or "balanced", COLD_START_PRESETS["balanced"])
            w_time, w_cost, w_carbon = preset
            conn.execute(
                "INSERT INTO user_preferences (user_id, w_time, w_cost, w_carbon, trip_count) VALUES (?, ?, ?, ?, 0)",
                (user_id, w_time, w_cost, w_carbon),
            )
            return UserPreference(user_id, w_time, w_cost, w_carbon, trip_count=0)

    def update(
        self,
        user_id: str,
        selected: dict[str, float],
        recommended: dict[str, float],
        learning_rate: float = 0.05,
    ) -> UserPreference:
        with self._lock, contextlib.closing(self._connect()) as conn, conn:
            row = conn.execute(
                "SELECT w_time, w_cost, w_carbon, trip_count FROM user_preferences WHERE user_id = ?",
                (user_id,),
            ).fetchone()
            if row is None:
                w_time, w_cost, w_carbon = COLD_START_PRESETS["balanced"]
                trip_count = 0
            else:
                w_time, w_cost, w_carbon, trip_count = row

            current = {"time": w_time, "cost": w_cost, "carbon": w_carbon}
            updated = {
                k: max(MIN_WEIGHT, current[k] + learning_rate * (selected[k] - recommended[k])) for k in current
            }
            total = sum(updated.values())
            final = {k: v / total for k, v in updated.items()}
            trip_count += 1

            conn.execute(
                """INSERT INTO user_preferences (user_id, w_time, w_cost, w_carbon, trip_count)
                   VALUES (?, ?, ?, ?, ?)
                   ON CONFLICT(user_id) DO UPDATE SET
                       w_time = excluded.w_time, w_cost = excluded.w_cost,
                       w_carbon = excluded.w_carbon, trip_count = excluded.trip_count""",
                (user_id, final["time"], final["cost"], final["carbon"], trip_count),
            )
            return UserPreference(user_id, final["time"], final["cost"], final["carbon"], trip_count)
