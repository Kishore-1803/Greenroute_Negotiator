"""
application/services/negotiation_log_store.py

NegotiationLogStore port + the record it persists. The ESG/audit trail for a completed
/api/v1/network/negotiate call: the utility ranking, the two-round transcript, the Coordinator
narration, and the ONE cost figure the recommendation turns on (the winning mode's
estimated_cost_inr).

Historical note (why winning_mode_cost_inr, not cost_saved_inr): the ride-pooling prototype's
negotiation_log had a single `cost_saved_inr` column that was written with the pooled-ride
total savings in one place and read as an agreed cost-share in another -- one name, two
meanings. The single-traveller utility engine has no such ambiguity: the winning mode has
exactly one cost, so the column is named for what it holds.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class NegotiationLogRecord:
    negotiation_id: str
    trip_id: str
    user_id: str
    computed_winner: str
    winning_mode_cost_inr: float | None
    winning_mode_carbon_g: float | None
    winning_mode_duration_min: float | None
    round_1_json: str
    round_2_json: str
    coordinator_json: str
    negotiation_provider: str
    weights_used_json: str
    created_at: str


class NegotiationLogStore(Protocol):
    def append(self, record: NegotiationLogRecord) -> None:
        ...
