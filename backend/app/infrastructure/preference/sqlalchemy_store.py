"""
infrastructure/preference/sqlalchemy_store.py

SQLAlchemy-backed PreferenceStore (Master Plan Section 3, Venkatram KS: "Architects the SQLite
database, online weight update rule math, and cold-start presets for new users"). One table,
one file, WAL mode so a demo doesn't hit "database is locked" under concurrent requests.
"""

from __future__ import annotations

from sqlalchemy.orm import sessionmaker

from app.domain.preference.entities import COLD_START_PRESETS
from app.domain.preference.entities import UserPreference as DomainUserPreference
from app.infrastructure.database.models import UserPreference as DbUserPreference

MIN_WEIGHT = 0.01

class SQLAlchemyPreferenceStore:
    def __init__(self, session_factory: sessionmaker):
        self._session_factory = session_factory
        
        from app.infrastructure.database.session import Base, engine
        Base.metadata.create_all(bind=engine)

    def get_or_create(self, user_id: str, stated_priority: str | None) -> DomainUserPreference:
        with self._session_factory() as session:
            db_pref = session.query(DbUserPreference).filter(DbUserPreference.user_id == user_id).first()
            if db_pref is not None:
                return DomainUserPreference(
                    user_id, db_pref.w_time, db_pref.w_cost, db_pref.w_carbon, db_pref.trip_count
                )

            preset = COLD_START_PRESETS.get(stated_priority or "balanced", COLD_START_PRESETS["balanced"])
            w_time, w_cost, w_carbon = preset
            
            new_pref = DbUserPreference(
                user_id=user_id,
                w_time=w_time,
                w_cost=w_cost,
                w_carbon=w_carbon,
                trip_count=0
            )
            session.add(new_pref)
            session.commit()
            
            return DomainUserPreference(user_id, w_time, w_cost, w_carbon, trip_count=0)

    def update(
        self,
        user_id: str,
        selected: dict[str, float],
        recommended: dict[str, float],
        learning_rate: float = 0.05,
    ) -> DomainUserPreference:
        with self._session_factory() as session:
            db_pref = session.query(DbUserPreference).filter(DbUserPreference.user_id == user_id).first()
            
            if db_pref is None:
                w_time, w_cost, w_carbon = COLD_START_PRESETS["balanced"]
                trip_count = 0
            else:
                w_time, w_cost, w_carbon = db_pref.w_time, db_pref.w_cost, db_pref.w_carbon
                trip_count = db_pref.trip_count

            current = {"time": w_time, "cost": w_cost, "carbon": w_carbon}
            updated = {
                k: max(MIN_WEIGHT, current[k] + learning_rate * (selected[k] - recommended[k])) for k in current
            }
            total = sum(updated.values())
            final = {k: v / total for k, v in updated.items()}
            trip_count += 1

            if db_pref is None:
                db_pref = DbUserPreference(
                    user_id=user_id,
                    w_time=final["time"],
                    w_cost=final["cost"],
                    w_carbon=final["carbon"],
                    trip_count=trip_count
                )
                session.add(db_pref)
            else:
                db_pref.w_time = final["time"]
                db_pref.w_cost = final["cost"]
                db_pref.w_carbon = final["carbon"]
                db_pref.trip_count = trip_count
                
            session.commit()
            return DomainUserPreference(user_id, final["time"], final["cost"], final["carbon"], trip_count)
