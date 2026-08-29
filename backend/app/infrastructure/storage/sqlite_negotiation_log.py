"""
infrastructure/storage/sqlite_negotiation_log.py

SQLite-backed NegotiationLogStore -- the audit trail for /api/v1/network/negotiate. Shares the
same database file as SQLiteTripStore / SQLitePreferenceStore (settings.preference_db_path).
"""

from __future__ import annotations

import contextlib
import sqlite3
import threading
from pathlib import Path

from app.application.services.negotiation_log_store import NegotiationLogRecord, NegotiationLogStore

_SCHEMA = """
CREATE TABLE IF NOT EXISTS negotiation_log (
    negotiation_id            TEXT PRIMARY KEY,
    trip_id                   TEXT NOT NULL,
    user_id                   TEXT,
    computed_winner           TEXT NOT NULL,
    winning_mode_cost_inr     REAL,
    winning_mode_carbon_g     REAL,
    winning_mode_duration_min REAL,
    round_1_json              TEXT NOT NULL,
    round_2_json              TEXT NOT NULL,
    coordinator_json          TEXT NOT NULL,
    negotiation_provider      TEXT NOT NULL,
    weights_used_json         TEXT NOT NULL,
    created_at                TEXT NOT NULL
);
"""


class SQLiteNegotiationLogStore(NegotiationLogStore):
    def __init__(self, db_path: str | Path):
        self._db_path = str(db_path)
        self._lock = threading.Lock()
        with contextlib.closing(self._connect()) as conn, conn:
            conn.execute(_SCHEMA)

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path, check_same_thread=False)
        conn.execute("PRAGMA journal_mode=WAL;")
        return conn

    def append(self, record: NegotiationLogRecord) -> None:
        with self._lock, contextlib.closing(self._connect()) as conn, conn:
            conn.execute(
                """INSERT INTO negotiation_log (
                       negotiation_id, trip_id, user_id, computed_winner,
                       winning_mode_cost_inr, winning_mode_carbon_g, winning_mode_duration_min,
                       round_1_json, round_2_json, coordinator_json,
                       negotiation_provider, weights_used_json, created_at
                   ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT(negotiation_id) DO UPDATE SET
                       trip_id = excluded.trip_id,
                       user_id = excluded.user_id,
                       computed_winner = excluded.computed_winner,
                       winning_mode_cost_inr = excluded.winning_mode_cost_inr,
                       winning_mode_carbon_g = excluded.winning_mode_carbon_g,
                       winning_mode_duration_min = excluded.winning_mode_duration_min,
                       round_1_json = excluded.round_1_json,
                       round_2_json = excluded.round_2_json,
                       coordinator_json = excluded.coordinator_json,
                       negotiation_provider = excluded.negotiation_provider,
                       weights_used_json = excluded.weights_used_json,
                       created_at = excluded.created_at""",
                (
                    record.negotiation_id,
                    record.trip_id,
                    record.user_id,
                    record.computed_winner,
                    record.winning_mode_cost_inr,
                    record.winning_mode_carbon_g,
                    record.winning_mode_duration_min,
                    record.round_1_json,
                    record.round_2_json,
                    record.coordinator_json,
                    record.negotiation_provider,
                    record.weights_used_json,
                    record.created_at,
                ),
            )
