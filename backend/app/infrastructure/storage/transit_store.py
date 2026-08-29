import math

from app.infrastructure.database.models import TransitStation
from app.infrastructure.database.session import Base, SessionLocal, engine

# Mock data for Chennai Transit
MOCK_STATIONS = [
    # Metro Stations
    {"station_id": "M_T_Nagar", "name": "T. Nagar Metro", "type": "metro", "lat": 13.0400, "lon": 80.2350},
    {"station_id": "M_Gemini", "name": "Gemini Flyover Metro", "type": "metro", "lat": 13.0480, "lon": 80.2450},
    {"station_id": "M_Saidapet", "name": "Saidapet Metro", "type": "metro", "lat": 13.0200, "lon": 80.2250},
    {"station_id": "M_Nungambakkam", "name": "Nungambakkam Metro", "type": "metro", "lat": 13.0550, "lon": 80.2400},
    {"station_id": "M_Alwarpet", "name": "Alwarpet Metro", "type": "metro", "lat": 13.0300, "lon": 80.2500},
    {"station_id": "M_Kodambakkam", "name": "Kodambakkam Metro", "type": "metro", "lat": 13.0450, "lon": 80.2200},
    
    # Bus Stops
    {"station_id": "B_T_Nagar_Terminus", "name": "T. Nagar Bus Terminus", "type": "bus", "lat": 13.0380, "lon": 80.2300},
    {"station_id": "B_Gemini", "name": "Gemini Bus Stop", "type": "bus", "lat": 13.0450, "lon": 80.2480},
    {"station_id": "B_Saidapet_Depot", "name": "Saidapet Bus Depot", "type": "bus", "lat": 13.0220, "lon": 80.2220},
    {"station_id": "B_Nungambakkam_High", "name": "Nungambakkam High Rd Stop", "type": "bus", "lat": 13.0580, "lon": 80.2380},
    {"station_id": "B_Alwarpet", "name": "Alwarpet Bus Stop", "type": "bus", "lat": 13.0320, "lon": 80.2550},
    {"station_id": "B_Kodambakkam_Bridge", "name": "Kodambakkam Bridge Stop", "type": "bus", "lat": 13.0420, "lon": 80.2250},
]

def init_db():
    Base.metadata.create_all(bind=engine)
    
    with SessionLocal() as session:
        # Seed data if empty
        if session.query(TransitStation).count() == 0:
            for s in MOCK_STATIONS:
                session.add(TransitStation(**s))
            session.commit()

def _distance_deg(lat1, lon1, lat2, lon2):
    return math.dist((lat1, lon1), (lat2, lon2))

def get_nearest_stations(lat: float, lon: float, station_type: str, limit: int = 2) -> list[tuple[float, float]]:
    """Returns a list of (lon, lat) for nearest stations of given type."""
    with SessionLocal() as session:
        stations = session.query(TransitStation).filter(TransitStation.type == station_type).all()
        
    # Sort by distance
    stations.sort(key=lambda s: _distance_deg(lat, lon, s.lat, s.lon))
    
    # Return (lon, lat) up to limit
    return [(s.lon, s.lat) for s in stations[:limit]]

# Initialize on import
init_db()
