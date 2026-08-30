from app.domain.memory.entities import EmbeddingProvider, SemanticTripMemory, VectorStore
from app.domain.preference.entities import UserPreference


class RecordTripMemoryUseCase:
    def __init__(self, embedding_provider: EmbeddingProvider, vector_store: VectorStore):
        self._embedding_provider = embedding_provider
        self._vector_store = vector_store

    def execute(
        self,
        trip_id: str,
        user_id: str,
        distance_km: float | None,
        recommended_mode: str,
        selected_mode: str,
        preference: UserPreference,
    ) -> None:
        # 1. Determine Distance Band with safe default
        dist = distance_km if distance_km is not None else 5.0
        if dist < 3:
            distance_band = "short (<3km)"
        elif dist < 10:
            distance_band = "medium (3-10km)"
        else:
            distance_band = "long (>10km)"

        # 2. Assume Time Band (Simplified for Hackathon, could parse from created_at)
        time_band = "commute_time"

        # 3. Create Natural Language Summary
        summary = (
            f"Trip context: {distance_band} distance during {time_band}. "
            f"GreenRoute recommended {recommended_mode}. "
            f"The user selected {selected_mode}. "
            f"Current priority weights - Speed: {preference.w_time:.2f}, "
            f"Cost: {preference.w_cost:.2f}, Carbon: {preference.w_carbon:.2f}."
        )

        # 4. Generate Embedding
        vector = self._embedding_provider.embed_text(summary)

        # 5. Upsert to Vector Store
        memory = SemanticTripMemory(
            id=trip_id,
            user_id=user_id,
            distance_km=distance_km,
            distance_band=distance_band,
            time_band=time_band,
            recommended_mode=recommended_mode,
            selected_mode=selected_mode,
            w_speed=preference.w_time,
            w_cost=preference.w_cost,
            w_carbon=preference.w_carbon,
            reason_text=summary
        )
        self._vector_store.upsert_trip(memory, vector)
