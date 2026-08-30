"""
infrastructure/storage/sqlalchemy_negotiation_log.py

SQLAlchemy-backed NegotiationLogStore -- the audit trail for /api/v1/network/negotiate. Shares the
same database file as SQLiteTripStore / SQLitePreferenceStore (settings.preference_db_path).
"""

from __future__ import annotations

from sqlalchemy.orm import sessionmaker

from app.application.services.negotiation_log_store import (
    NegotiationLogRecord,
    NegotiationLogStore,
)
from app.infrastructure.database.models import NegotiationLog


class SQLAlchemyNegotiationLogStore(NegotiationLogStore):
    def __init__(self, session_factory: sessionmaker):
        self._session_factory = session_factory
        
        # Ensure the table exists on startup
        from app.infrastructure.database.session import Base, engine
        Base.metadata.create_all(bind=engine)

    def append(self, record: NegotiationLogRecord) -> None:
        with self._session_factory() as session:
            db_log = session.query(NegotiationLog).filter(NegotiationLog.negotiation_id == record.negotiation_id).first()
            if db_log:
                db_log.trip_id = record.trip_id
                db_log.user_id = record.user_id
                db_log.computed_winner = record.computed_winner
                db_log.winning_mode_cost_inr = record.winning_mode_cost_inr
                db_log.winning_mode_carbon_g = record.winning_mode_carbon_g
                db_log.winning_mode_duration_min = record.winning_mode_duration_min
                db_log.round_1_json = record.round_1_json
                db_log.round_2_json = record.round_2_json
                db_log.coordinator_json = record.coordinator_json
                db_log.negotiation_provider = record.negotiation_provider
                db_log.weights_used_json = record.weights_used_json
                db_log.created_at = record.created_at
            else:
                db_log = NegotiationLog(
                    negotiation_id=record.negotiation_id,
                    trip_id=record.trip_id,
                    user_id=record.user_id,
                    computed_winner=record.computed_winner,
                    winning_mode_cost_inr=record.winning_mode_cost_inr,
                    winning_mode_carbon_g=record.winning_mode_carbon_g,
                    winning_mode_duration_min=record.winning_mode_duration_min,
                    round_1_json=record.round_1_json,
                    round_2_json=record.round_2_json,
                    coordinator_json=record.coordinator_json,
                    negotiation_provider=record.negotiation_provider,
                    weights_used_json=record.weights_used_json,
                    created_at=record.created_at
                )
                session.add(db_log)
            session.commit()
