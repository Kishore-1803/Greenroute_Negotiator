from sqlalchemy import TIMESTAMP, Column, Float, Integer, String, Text, func

from .session import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=True, index=True)
    phone = Column(String, unique=True, nullable=True, index=True)
    password_hash = Column(String, nullable=False)
    salt = Column(String, nullable=False)
    name = Column(String, nullable=False)
    location = Column(String, default="Chennai, TN")
    personality_tag = Column(String, default="Eco-Smart Daily Commuter")
    preferred_modes = Column(Text, default='["car", "two_wheeler", "cycling"]')
    avatar_url = Column(String, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())

class TransitStation(Base):
    __tablename__ = "transit_stations"

    station_id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False, index=True)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)

class UserPreference(Base):
    __tablename__ = "user_preferences"

    user_id = Column(String, primary_key=True)
    w_time = Column(Float, nullable=False)
    w_cost = Column(Float, nullable=False)
    w_carbon = Column(Float, nullable=False)
    trip_count = Column(Integer, nullable=False, default=0)

class Trip(Base):
    __tablename__ = "trips"

    trip_id = Column(String, primary_key=True)
    user_id = Column(String, nullable=True)
    data = Column(Text, nullable=False)

class TripHistory(Base):
    __tablename__ = "trip_history"

    trip_id = Column(String, primary_key=True)
    user_id = Column(String, nullable=True, index=True)
    selected_mode = Column(String, nullable=False)
    distance_km = Column(Float, nullable=False)
    carbon_g = Column(Float, nullable=False)
    cost_inr = Column(Float, nullable=False)
    carbon_saved_vs_car_g = Column(Float, nullable=False)
    cost_saved_vs_car_inr = Column(Float, nullable=False)
    cooperation_used = Column(Integer, nullable=False, default=0)
    origin_name = Column(String, nullable=True)
    destination_name = Column(String, nullable=True)
    duration_min = Column(Float, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())

class NegotiationLog(Base):
    __tablename__ = "negotiation_log"

    negotiation_id = Column(String, primary_key=True)
    trip_id = Column(String, nullable=False)
    user_id = Column(String, nullable=True)
    computed_winner = Column(String, nullable=False)
    winning_mode_cost_inr = Column(Float, nullable=True)
    winning_mode_carbon_g = Column(Float, nullable=True)
    winning_mode_duration_min = Column(Float, nullable=True)
    round_1_json = Column(Text, nullable=False)
    round_2_json = Column(Text, nullable=False)
    coordinator_json = Column(Text, nullable=False)
    negotiation_provider = Column(String, nullable=False)
    weights_used_json = Column(Text, nullable=False)
    created_at = Column(String, nullable=False)
