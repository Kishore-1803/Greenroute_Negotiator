import logging
from app.domain.memory.entities import SemanticTripMemory, VectorStore

try:
    from actian_vectorai import VectorAIClient, VectorParams, Distance, PointStruct
except ImportError:
    VectorAIClient = None

logger = logging.getLogger(__name__)


class ActianVectorStore(VectorStore):
    def __init__(self, host: str = "localhost:50051", vector_dim: int = 384):
        self.host = host
        self.collection_name = "greenroute_trip_memory"
        self.vector_dim = vector_dim
        self._init_collection()

    def _init_collection(self):
        if not VectorAIClient:
            logger.warning("actian-vectorai not installed. Vector DB disabled.")
            return

        try:
            with VectorAIClient(self.host) as client:
                # Basic check if collection exists; actian_vectorai API varies, typically create is idempotent
                try:
                    client.collections.create(
                        self.collection_name,
                        vectors_config=VectorParams(
                            size=self.vector_dim,
                            distance=Distance.Cosine
                        )
                    )
                except Exception as e:
                    # Ignore if already exists
                    logger.info(f"Collection {self.collection_name} initialization: {e}")
        except Exception as e:
            logger.error(f"Failed to connect to Actian VectorAI at {self.host}: {e}")

    def upsert_trip(self, memory: SemanticTripMemory, vector: list[float]) -> None:
        if not VectorAIClient:
            return

        try:
            with VectorAIClient(self.host) as client:
                client.points.upsert(
                    self.collection_name,
                    [PointStruct(
                        id=memory.id,
                        vector=vector,
                        payload={
                            "user_id": memory.user_id,
                            "distance_km": memory.distance_km,
                            "distance_band": memory.distance_band,
                            "time_band": memory.time_band,
                            "recommended_mode": memory.recommended_mode,
                            "selected_mode": memory.selected_mode,
                            "w_speed": memory.w_speed,
                            "w_cost": memory.w_cost,
                            "w_carbon": memory.w_carbon,
                            "reason_text": memory.reason_text
                        }
                    )]
                )
        except Exception as e:
            logger.error(f"Failed to upsert trip memory {memory.id}: {e}")

    def search_similar_trips(
        self, user_id: str, query_vector: list[float], limit: int = 3
    ) -> list[SemanticTripMemory]:
        if not VectorAIClient:
            return []

        try:
            with VectorAIClient(self.host) as client:
                # actian-vectorai typical search API
                # filtering by payload might depend on exact filter syntax (e.g. Filter(must=[FieldCondition(key="user_id", match=MatchValue(value=user_id))]))
                # For this MVP, we fetch top K and filter in memory if filter API is complex
                results = client.points.search(
                    self.collection_name,
                    vector=query_vector,
                    limit=limit * 3
                )
                
                # Filter for user and map back to entity
                memories = []
                for res in getattr(results, 'points', results):
                    payload = getattr(res, 'payload', {}) or {}
                    if payload.get("user_id") == user_id:
                        memories.append(SemanticTripMemory(
                            id=getattr(res, 'id', ""),
                            user_id=payload.get("user_id", ""),
                            distance_km=payload.get("distance_km", 0.0),
                            distance_band=payload.get("distance_band", ""),
                            time_band=payload.get("time_band", ""),
                            recommended_mode=payload.get("recommended_mode", ""),
                            selected_mode=payload.get("selected_mode", ""),
                            w_speed=payload.get("w_speed", 0.0),
                            w_cost=payload.get("w_cost", 0.0),
                            w_carbon=payload.get("w_carbon", 0.0),
                            reason_text=payload.get("reason_text", "")
                        ))
                return memories[:limit]
        except Exception as e:
            logger.error(f"Failed to search similar trips for user {user_id}: {e}")
            return []
