from __future__ import annotations

from collections import defaultdict
from typing import Any

from app.repositories.ai_repository import AiRepository
from app.repositories.fornecedor_repository import FornecedorRepository
from app.repositories.item_repository import ItemRepository
from app.services.embedding_service import EmbeddingService
from app.utils.normalization import normalize_text
from app.utils.text_cleaning import clean_for_storage


class IndexService:
    def __init__(self) -> None:
        self.ai_repository = AiRepository()
        self.item_repository = ItemRepository()
        self.fornecedor_repository = FornecedorRepository()
        self.embedding_service = EmbeddingService()

    def rebuild(
        self,
        entity_types: list[str] | None = None,
        entity_id: str | None = None,
        clear_first: bool = False
    ) -> dict[str, Any]:
        valid_types = {"material", "catmat_item", "fornecedor"}
        requested = {str(item or "").strip().lower() for item in (entity_types or []) if str(item or "").strip()}
        selected = sorted(requested & valid_types) if requested else sorted(valid_types)

        cleared = 0
        if clear_first:
            for entity_type in selected:
                cleared += self.ai_repository.clear_documents(entity_type=entity_type, entity_id=entity_id)

        by_type = defaultdict(int)
        docs: list[dict[str, Any]] = []

        if "material" in selected:
            for row in self.item_repository.fetch_materials(entity_id=entity_id):
                doc = self._to_document(row, default_source="materials")
                docs.append(doc)
                by_type[doc["entity_type"]] += 1

        if "catmat_item" in selected:
            for row in self.item_repository.fetch_catmat_items(entity_id=entity_id):
                doc = self._to_document(row, default_source="catmat_itens")
                docs.append(doc)
                by_type[doc["entity_type"]] += 1

        if "fornecedor" in selected:
            for row in self.fornecedor_repository.fetch_fornecedores(entity_id=entity_id):
                doc = self._to_document(row, default_source="fornecedores")
                docs.append(doc)
                by_type[doc["entity_type"]] += 1

        upserted = self.ai_repository.upsert_documents(docs)
        return {
            "cleared": cleared,
            "upserted": upserted,
            "by_entity_type": dict(by_type)
        }

    def clear(self, entity_type: str | None = None, entity_id: str | None = None) -> int:
        return self.ai_repository.clear_documents(entity_type=entity_type, entity_id=entity_id)

    def _to_document(self, row: dict[str, Any], default_source: str) -> dict[str, Any]:
        title = clean_for_storage(str(row.get("title") or ""), max_len=1000)
        content = clean_for_storage(str(row.get("content") or ""), max_len=16000)
        normalized = normalize_text(f"{title} {content}")
        metadata = row.get("metadata_json") if isinstance(row.get("metadata_json"), dict) else {}

        source_module = str(metadata.get("source") or row.get("source_module") or default_source)
        ativo = metadata.get("ativo", True)
        status = "active" if bool(ativo) else "inactive"

        embedding_text = f"{title}\n{content}".strip()
        embedding = self.embedding_service.embed_text(embedding_text)

        return {
            "entity_type": str(row.get("entity_type") or ""),
            "entity_id": str(row.get("entity_id") or ""),
            "title": title,
            "content": content,
            "content_normalized": normalized,
            "source_module": source_module,
            "metadata_json": metadata,
            "embedding": embedding,
            "status": status
        }
