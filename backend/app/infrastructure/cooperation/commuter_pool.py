"""
infrastructure/cooperation/commuter_pool.py
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class SimulatedCommuter:
    id: str
    name: str
    origin: tuple[float, float]       # (lon, lat)
    destination: tuple[float, float]  # (lon, lat)
    departure_hour: float             # e.g. 8.5 = 8:30 AM
    departure_window_min: float       # ±window
    mode: str                         # "car" | "two_wheeler" | "cycling"
    max_detour_min: float
    max_walk_m: float
    willing_to_share: bool
    cost_per_km_inr: float


# A predefined pool of realistic commuters moving through Coimbatore
# Corridors: 
# 1. Gandhipuram <-> RS Puram <-> Peelamedu <-> Saravanampatti (IT corridor)
# 2. PSG Tech <-> Ukkadam <-> Town Hall (student/shopping corridor)
# 3. Singanallur <-> Avinashi Road <-> Tidel Park (office corridor)

COIMBATORE_COMMUTERS = [
    SimulatedCommuter(
        id="c_1", name="Priya S.", 
        origin=(76.9558, 11.0168), destination=(76.9725, 11.0183),  # Gandhipuram -> Peelamedu
        departure_hour=8.5, departure_window_min=30, mode="car", 
        max_detour_min=8.0, max_walk_m=0.0, willing_to_share=True, cost_per_km_inr=5.0
    ),
    SimulatedCommuter(
        id="c_2", name="Raj K.", 
        origin=(76.9500, 11.0050), destination=(76.9620, 11.0005),  # RS Puram -> Town Hall
        departure_hour=8.75, departure_window_min=15, mode="two_wheeler", 
        max_detour_min=5.0, max_walk_m=500.0, willing_to_share=True, cost_per_km_inr=2.5
    ),
    SimulatedCommuter(
        id="c_3", name="Anita M.", 
        origin=(77.0050, 11.0020), destination=(76.9605, 10.9955),  # Singanallur -> Tidel Park
        departure_hour=9.0, departure_window_min=45, mode="car", 
        max_detour_min=10.0, max_walk_m=0.0, willing_to_share=True, cost_per_km_inr=5.0
    ),
    SimulatedCommuter(
        id="c_4", name="Vikram D.", 
        origin=(76.9558, 11.0168), destination=(76.9900, 11.0450),  # Gandhipuram -> Saravanampatti
        departure_hour=8.25, departure_window_min=20, mode="two_wheeler", 
        max_detour_min=6.0, max_walk_m=400.0, willing_to_share=True, cost_per_km_inr=2.5
    ),
    SimulatedCommuter(
        id="c_5", name="Meera T.", 
        origin=(76.9725, 11.0183), destination=(77.0050, 11.0020),  # Peelamedu -> Singanallur
        departure_hour=17.5, departure_window_min=30, mode="car", 
        max_detour_min=12.0, max_walk_m=0.0, willing_to_share=True, cost_per_km_inr=5.0
    ),
    SimulatedCommuter(
        id="c_6", name="Karthik R.", 
        origin=(76.9735, 11.0070), destination=(76.9590, 10.9925),  # PSG Tech -> Ukkadam
        departure_hour=16.0, departure_window_min=60, mode="two_wheeler", 
        max_detour_min=5.0, max_walk_m=600.0, willing_to_share=True, cost_per_km_inr=2.5
    ),
    SimulatedCommuter(
        id="c_7", name="Lakshmi V.", 
        origin=(76.9605, 10.9955), destination=(76.9850, 11.0200),  # Tidel Park -> Avinashi Road
        departure_hour=18.0, departure_window_min=30, mode="car", 
        max_detour_min=8.0, max_walk_m=0.0, willing_to_share=True, cost_per_km_inr=5.0
    ),
    SimulatedCommuter(
        id="c_8", name="Surya P.", 
        origin=(76.9620, 11.0005), destination=(76.9558, 11.0168),  # Town Hall -> Gandhipuram
        departure_hour=9.5, departure_window_min=20, mode="two_wheeler", 
        max_detour_min=5.0, max_walk_m=300.0, willing_to_share=True, cost_per_km_inr=2.5
    ),
    SimulatedCommuter(
        id="c_9", name="Divya S.", 
        origin=(76.9500, 11.0050), destination=(76.9735, 11.0070),  # RS Puram -> PSG Tech
        departure_hour=8.5, departure_window_min=30, mode="car", 
        max_detour_min=7.0, max_walk_m=0.0, willing_to_share=True, cost_per_km_inr=5.0
    ),
    SimulatedCommuter(
        id="c_10", name="Arun N.", 
        origin=(76.9620, 11.0100), destination=(76.9605, 10.9955),  # Hope College -> Tidel Park
        departure_hour=8.75, departure_window_min=20, mode="two_wheeler", 
        max_detour_min=4.0, max_walk_m=800.0, willing_to_share=True, cost_per_km_inr=2.5
    ),
    SimulatedCommuter(
        id="c_11", name="Bala G.", 
        origin=(76.9560, 11.0240), destination=(76.9558, 11.0168),  # GCT -> Gandhipuram
        departure_hour=17.0, departure_window_min=45, mode="cycling", 
        max_detour_min=10.0, max_walk_m=2000.0, willing_to_share=True, cost_per_km_inr=0.0
    ),
    SimulatedCommuter(
        id="c_12", name="Swathi K.", 
        origin=(77.0050, 11.0020), destination=(76.9725, 11.0183),  # Singanallur -> Peelamedu
        departure_hour=8.0, departure_window_min=30, mode="car", 
        max_detour_min=9.0, max_walk_m=0.0, willing_to_share=True, cost_per_km_inr=5.0
    ),
]
