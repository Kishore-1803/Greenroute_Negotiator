"""
infrastructure/cooperation/transit_hubs.py
"""

from dataclasses import dataclass

@dataclass(frozen=True)
class TransitHub:
    id: str
    label: str
    location: tuple[float, float]  # (lon, lat)
    hub_type: str                  # "bus_stand" | "railway_station"

COIMBATORE_TRANSIT_HUBS = [
    TransitHub("gandhi_bus", "Gandhipuram Bus Stand", (76.9558, 11.0168), "bus_stand"),
    TransitHub("ukkadam_bus", "Ukkadam Bus Stand", (76.9590, 10.9925), "bus_stand"),
    TransitHub("cbejn_rly", "Coimbatore Junction Railway", (76.9680, 10.9960), "railway_station"),
    TransitHub("singa_bus", "Singanallur Bus Stop", (77.0140, 11.0030), "bus_stand"),
    TransitHub("townhall_bus", "Town Hall Bus Stop", (76.9620, 11.0005), "bus_stand"),
]
