from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class SemanticTripMemory:
    id: str
    user_id: str
    distance_km: float
    distance_band: str
    time_band: str
    recommended_mode: str
    selected_mode: str
    w_speed: float
    w_cost: float
    w_carbon: float
    reason_text: str


class EmbeddingProvider(Protocol):
    def embed_text(self, text: str) -> list[float]:
        """Convert a text string into a vector of floats."""
        ...


class VectorStore(Protocol):
    def upsert_trip(self, memory: SemanticTripMemory, vector: list[float]) -> None:
        """Store a semantic trip memory into the vector database."""
        ...

    def search_similar_trips(
        self, user_id: str, query_vector: list[float], limit: int = 3
    ) -> list[SemanticTripMemory]:
        """Find the most similar past trips for a specific user."""
        ...
