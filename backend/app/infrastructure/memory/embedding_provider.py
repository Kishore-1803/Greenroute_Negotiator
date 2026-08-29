import logging
from app.domain.memory.entities import EmbeddingProvider
from app.infrastructure.config.settings import Settings

try:
    import cohere
except ImportError:
    cohere = None

logger = logging.getLogger(__name__)


class CohereEmbeddingProvider(EmbeddingProvider):
    def __init__(self, settings: Settings):
        self.api_key = settings.cohere_api_key if hasattr(settings, "cohere_api_key") else None
        if not self.api_key or not cohere:
            logger.warning("Cohere API key or package missing. Embeddings disabled.")
            self.client = None
        else:
            self.client = cohere.Client(self.api_key)

    def embed_text(self, text: str) -> list[float]:
        if not self.client:
            # Fallback to a zero-vector if unconfigured, or raise an error
            return [0.0] * 384
        
        response = self.client.embed(
            texts=[text],
            model="embed-english-v3.0",
            input_type="search_document"
        )
        return response.embeddings[0]


class FallbackEmbeddingProvider(EmbeddingProvider):
    """Deterministic, zero-dependency fallback for hackathon demos without Cohere."""
    def embed_text(self, text: str) -> list[float]:
        # Return a naive deterministic pseudo-vector just to test the Actian connection
        return [float(len(text) % i) for i in range(1, 385)]
