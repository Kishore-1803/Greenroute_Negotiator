"""
infrastructure/storage/impact_store.py

Persistent Trip Impact repository backed by SQLite.
"""

from __future__ import annotations

import contextlib
import sqlite3
import threading
from pathlib import Path
from typing import Any, Optional
from pydantic import BaseModel


class UserImpactStats(BaseModel):
    total_trips: int
    green_choices: int
    carbon_saved_g: float
    cost_saved_inr: float
    vehicle_trips_prevented: int
    trees_equivalent: int


class JourneyRecordDTO(BaseModel):
    trip_id: str
    selected_mode: str
    distance_km: float
    carbon_g: float
    cost_inr: float
    carbon_saved_vs_car_g: float
    cost_saved_vs_car_inr: float
    cooperation_used: bool
    created_at: str


_SCHEMA = """
CREATE TABLE IF NOT EXISTS trip_history (
    trip_id TEXT PRIMARY KEY,
    user_id TEXT,
    selected_mode TEXT,
    distance_km REAL,
    carbon_g REAL,
    cost_inr REAL,
    carbon_saved_vs_car_g REAL,
    cost_saved_vs_car_inr REAL,
    cooperation_used BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_trip_history_user ON trip_history(user_id);
"""


class SQLiteImpactStore:
    def __init__(self, db_path: str | Path):
        self._db_path = str(db_path)
        self._lock = threading.Lock()
        
        # Ensure the directory and table exist on startup
        Path(self._db_path).parent.mkdir(parents=True, exist_ok=True)
        with contextlib.closing(self._connect()) as conn, conn:
            conn.execute(_SCHEMA)

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path, check_same_thread=False)
        conn.execute("PRAGMA journal_mode=WAL;")
        return conn

    def record_trip(
        self, user_id: str, trip_id: str, selected_mode: str, distance_km: float, 
        carbon_g: float, cost_inr: float, carbon_saved_vs_car_g: float, 
        cost_saved_vs_car_inr: float, cooperation_used: bool = False
    ) -> None:
        with self._lock, contextlib.closing(self._connect()) as conn, conn:
            conn.execute(
                """INSERT INTO trip_history (
                       trip_id, user_id, selected_mode, distance_km, 
                       carbon_g, cost_inr, carbon_saved_vs_car_g, 
                       cost_saved_vs_car_inr, cooperation_used
                   )
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT(trip_id) DO UPDATE SET
                       selected_mode = excluded.selected_mode,
                       carbon_g = excluded.carbon_g,
                       cost_inr = excluded.cost_inr,
                       carbon_saved_vs_car_g = excluded.carbon_saved_vs_car_g,
                       cost_saved_vs_car_inr = excluded.cost_saved_vs_car_inr,
                       cooperation_used = excluded.cooperation_used""",
                (trip_id, user_id, selected_mode, distance_km, carbon_g, cost_inr, 
                 carbon_saved_vs_car_g, cost_saved_vs_car_inr, cooperation_used),
            )

    def get_user_impact(self, user_id: str) -> UserImpactStats:
        with self._lock, contextlib.closing(self._connect()) as conn:
            row = conn.execute(
                """SELECT 
                    COUNT(trip_id),
                    SUM(CASE WHEN selected_mode != 'car' OR cooperation_used = 1 THEN 1 ELSE 0 END),
                    SUM(carbon_saved_vs_car_g),
                    SUM(cost_saved_vs_car_inr),
                    SUM(CASE WHEN cooperation_used = 1 THEN 1 ELSE 0 END)
                   FROM trip_history
                   WHERE user_id = ?""",
                (user_id,),
            ).fetchone()
            
            if not row or row[0] == 0:
                return UserImpactStats(
                    total_trips=0, green_choices=0, carbon_saved_g=0.0, 
                    cost_saved_inr=0.0, vehicle_trips_prevented=0, trees_equivalent=0
                )
                
            total_trips = row[0] or 0
            green_choices = row[1] or 0
            carbon_saved = row[2] or 0.0
            cost_saved = row[3] or 0.0
            coop = row[4] or 0
            
            trees_equivalent = int(carbon_saved / 21000)
            
            return UserImpactStats(
                total_trips=total_trips,
                green_choices=green_choices,
                carbon_saved_g=round(carbon_saved, 1),
                cost_saved_inr=round(cost_saved, 1),
                vehicle_trips_prevented=coop,
                trees_equivalent=trees_equivalent
            )

    def get_user_history(self, user_id: str, limit: int = 20) -> list[JourneyRecordDTO]:
        with self._lock, contextlib.closing(self._connect()) as conn:
            cursor = conn.execute(
                """SELECT trip_id, selected_mode, distance_km, carbon_g, 
                          cost_inr, carbon_saved_vs_car_g, cost_saved_vs_car_inr, 
                          cooperation_used, created_at
                   FROM trip_history
                   WHERE user_id = ?
                   ORDER BY created_at DESC
                   LIMIT ?""",
                (user_id, limit),
            )
            rows = cursor.fetchall()
            return [
                JourneyRecordDTO(
                    trip_id=r[0],
                    selected_mode=r[1],
                    distance_km=r[2],
                    carbon_g=r[3],
                    cost_inr=r[4],
                    carbon_saved_vs_car_g=r[5],
                    cost_saved_vs_car_inr=r[6],
                    cooperation_used=bool(r[7]),
                    created_at=str(r[8]),
                )
                for r in rows
            ]
