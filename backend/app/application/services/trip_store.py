"""
application/services/trip_store.py

In-memory Trip repository -- no database in this MVP (Part R). Deliberately a plain class,
not a domain interface with multiple implementations: nothing today anticipates swapping the
backing store, so a Protocol here would be an empty abstraction (Part U guidance: "avoid
empty abstractions"). If persistence becomes a real requirement later, this is the one place
to introduce a TripRepository interface, per Part R's instruction to go through a repository
interface rather than coupling the domain directly to a database.
"""

from __future__ import annotations

from app.domain.common.errors import TripNotFoundError
from app.domain.decision.entities import Trip


class InMemoryTripStore:
    def __init__(self):
        self._trips: dict[str, Trip] = {}

    def save(self, trip: Trip) -> None:
        self._trips[trip.trip_id] = trip

    def get(self, trip_id: str) -> Trip:
        trip = self._trips.get(trip_id)
        if trip is None:
            raise TripNotFoundError(f"unknown trip_id {trip_id!r}")
        return trip
