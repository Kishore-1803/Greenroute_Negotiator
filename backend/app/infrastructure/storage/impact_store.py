"""
infrastructure/storage/impact_store.py

Persistent Trip Impact repository backed by SQLAlchemy.
"""

from __future__ import annotations

from pydantic import BaseModel
from sqlalchemy import case, func, or_
from sqlalchemy.orm import sessionmaker

from app.infrastructure.database.models import TripHistory


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
    created_at: str | None = None
    origin_name: str | None = None
    destination_name: str | None = None
    duration_min: float | None = None
    route_geometry: list[list[float]] = []
    eco_score: float = 85.0


class SQLiteImpactStore:
    def __init__(self, session_factory: sessionmaker):
        self._session_factory = session_factory
        
        # Ensure the table exists on startup
        from app.infrastructure.database.session import Base, engine
        Base.metadata.create_all(bind=engine)

    def record_trip(
        self, user_id: str, trip_id: str, selected_mode: str, distance_km: float, 
        carbon_g: float, cost_inr: float, carbon_saved_vs_car_g: float, 
        cost_saved_vs_car_inr: float, cooperation_used: bool = False,
        origin_name: str | None = None, destination_name: str | None = None,
        duration_min: float | None = None,
        route_geometry: str | None = None,
        eco_score: float | None = 85.0
    ) -> None:
        with self._session_factory() as session:
            db_hist = session.query(TripHistory).filter(TripHistory.trip_id == trip_id).first()
            if db_hist:
                db_hist.selected_mode = selected_mode
                db_hist.carbon_g = carbon_g
                db_hist.cost_inr = cost_inr
                db_hist.carbon_saved_vs_car_g = carbon_saved_vs_car_g
                db_hist.cost_saved_vs_car_inr = cost_saved_vs_car_inr
                db_hist.cooperation_used = 1 if cooperation_used else 0
                db_hist.origin_name = origin_name
                db_hist.destination_name = destination_name
                db_hist.duration_min = duration_min
                if route_geometry:
                    db_hist.route_geometry = route_geometry
                if eco_score is not None:
                    db_hist.eco_score = eco_score
            else:
                db_hist = TripHistory(
                    trip_id=trip_id,
                    user_id=user_id,
                    selected_mode=selected_mode,
                    distance_km=distance_km,
                    carbon_g=carbon_g,
                    cost_inr=cost_inr,
                    carbon_saved_vs_car_g=carbon_saved_vs_car_g,
                    cost_saved_vs_car_inr=cost_saved_vs_car_inr,
                    cooperation_used=1 if cooperation_used else 0,
                    origin_name=origin_name,
                    destination_name=destination_name,
                    duration_min=duration_min,
                    route_geometry=route_geometry,
                    eco_score=eco_score if eco_score is not None else 85.0
                )
                session.add(db_hist)
            session.commit()

    def get_user_impact(self, user_id: str) -> UserImpactStats:
        with self._session_factory() as session:
            result = session.query(
                func.count(TripHistory.trip_id),
                func.sum(
                    case(
                        (or_(TripHistory.selected_mode != 'car', TripHistory.cooperation_used == 1), 1),
                        else_=0
                    )
                ),
                func.sum(TripHistory.carbon_saved_vs_car_g),
                func.sum(TripHistory.cost_saved_vs_car_inr),
                func.sum(
                    case(
                        (TripHistory.cooperation_used == 1, 1),
                        else_=0
                    )
                )
            ).filter(TripHistory.user_id == user_id).first()
            
            if not result or result[0] == 0:
                return UserImpactStats(
                    total_trips=0, green_choices=0, carbon_saved_g=0.0, 
                    cost_saved_inr=0.0, vehicle_trips_prevented=0, trees_equivalent=0
                )
                
            total_trips = result[0] or 0
            green_choices = result[1] or 0
            carbon_saved = result[2] or 0.0
            cost_saved = result[3] or 0.0
            coop = result[4] or 0
            
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
        import json
        with self._session_factory() as session:
            records = session.query(TripHistory)\
                .filter(TripHistory.user_id == user_id)\
                .order_by(TripHistory.created_at.desc())\
                .limit(limit)\
                .all()
                
            results = []
            for r in records:
                coords: list[list[float]] = []
                if r.route_geometry:
                    try:
                        parsed = json.loads(r.route_geometry)
                        if isinstance(parsed, dict) and "coordinates" in parsed:
                            coords = parsed["coordinates"]
                        elif isinstance(parsed, list):
                            coords = parsed
                    except Exception:
                        coords = []

                results.append(
                    JourneyRecordDTO(
                        trip_id=r.trip_id,
                        selected_mode=r.selected_mode,
                        distance_km=r.distance_km,
                        carbon_g=r.carbon_g,
                        cost_inr=r.cost_inr,
                        carbon_saved_vs_car_g=r.carbon_saved_vs_car_g,
                        cost_saved_vs_car_inr=r.cost_saved_vs_car_inr,
                        cooperation_used=bool(r.cooperation_used),
                        created_at=str(r.created_at),
                        origin_name=r.origin_name,
                        destination_name=r.destination_name,
                        duration_min=r.duration_min,
                        route_geometry=coords,
                        eco_score=r.eco_score if r.eco_score is not None else 85.0,
                    )
                )
            return results
