"""
application/services/trip_store.py

Trip repository interface.
"""

from typing import Protocol

from app.domain.decision.entities import Trip


class TripStore(Protocol):
    def save(self, trip: Trip) -> None:
        ...

    def get(self, trip_id: str) -> Trip:
        ...
