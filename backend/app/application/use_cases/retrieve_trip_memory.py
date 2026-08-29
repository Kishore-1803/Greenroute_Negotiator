from app.domain.memory.entities import EmbeddingProvider, SemanticTripMemory, VectorStore


class RetrieveTripMemoryUseCase:
    def __init__(self, embedding_provider: EmbeddingProvider, vector_store: VectorStore):
        self._embedding_provider = embedding_provider
        self._vector_store = vector_store

    def execute(self, user_id: str, distance_km: float) -> list[SemanticTripMemory]:
        # 1. Determine Distance Band
        if distance_km < 3:
            distance_band = "short (<3km)"
        elif distance_km < 10:
            distance_band = "medium (3-10km)"
        else:
            distance_band = "long (>10km)"

        # 2. Formulate query summary
        query_summary = f"Find trips for a {distance_band} distance commute."

        # 3. Embed Query
        vector = self._embedding_provider.embed_text(query_summary)

        # 4. Search Similar Trips
        return self._vector_store.search_similar_trips(user_id=user_id, query_vector=vector, limit=2)
