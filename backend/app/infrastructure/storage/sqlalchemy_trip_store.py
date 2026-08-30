"""
infrastructure/storage/sqlalchemy_trip_store.py

Persistent Trip repository backed by SQLAlchemy.
"""

from __future__ import annotations

from pydantic import TypeAdapter
from sqlalchemy.orm import sessionmaker

from app.application.services.trip_store import TripStore
from app.domain.common.errors import TripNotFoundError
from app.domain.decision.entities import Trip as DomainTrip
from app.infrastructure.database.models import Trip as DbTrip


class SQLAlchemyTripStore(TripStore):
    def __init__(self, session_factory: sessionmaker):
        self._session_factory = session_factory
        self._adapter = TypeAdapter(DomainTrip)
        
        # We assume tables are created via Base.metadata.create_all() elsewhere
        from app.infrastructure.database.session import Base, engine
        Base.metadata.create_all(bind=engine)

    def save(self, trip: DomainTrip) -> None:
        data_json = self._adapter.dump_json(trip).decode("utf-8")
        
        with self._session_factory() as session:
            db_trip = session.query(DbTrip).filter(DbTrip.trip_id == trip.trip_id).first()
            if db_trip:
                db_trip.user_id = trip.user_id
                db_trip.data = data_json
            else:
                db_trip = DbTrip(
                    trip_id=trip.trip_id,
                    user_id=trip.user_id,
                    data=data_json
                )
                session.add(db_trip)
            session.commit()

    def get(self, trip_id: str) -> DomainTrip:
        with self._session_factory() as session:
            db_trip = session.query(DbTrip).filter(DbTrip.trip_id == trip_id).first()
            if not db_trip:
                raise TripNotFoundError(f"unknown trip_id {trip_id!r}")
                
            return self._adapter.validate_json(db_trip.data)
