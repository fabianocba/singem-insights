from __future__ import annotations

from hashlib import blake2b
from math import sqrt

from app.core.config import get_settings
from app.utils.text_cleaning import clean_for_embedding
from app.utils.normalization import tokenize


class EmbeddingService:
    """Gera embeddings deterministicos para o nucleo de busca semantica."""

    def __init__(self) -> None:
        settings = get_settings()
        self.settings = settings
        self.dimension = max(8, int(settings.embedding_dimension))

    def embed_text(self, text: str) -> list[float] | None:
        clean_text = clean_for_embedding(text, max_len=self.settings.ai_search_max_text_size)
        if not clean_text:
            return None

        # Provider hash e fallback padrao e tambem o modo explicito atual.
        return self._hash_embedding(clean_text)

    def _hash_embedding(self, text: str) -> list[float] | None:
        tokens = tokenize(text)
        if not tokens:
            return None

        vector = [0.0] * self.dimension
        for token in tokens:
            token_weight = 1.0 + min(len(token), 20) / 40.0
            for projection in range(4):
                payload = f"{token}|{projection}".encode("utf-8")
                digest = blake2b(payload, digest_size=16).digest()
                idx = int.from_bytes(digest[0:4], "big") % self.dimension
                sign = -1.0 if digest[4] % 2 else 1.0
                magnitude = 0.5 + (int.from_bytes(digest[5:7], "big") % 500) / 1000.0
                vector[idx] += sign * magnitude * token_weight

        norm = sqrt(sum(value * value for value in vector))
        if norm <= 0:
            return None

        return [round(value / norm, 8) for value in vector]
