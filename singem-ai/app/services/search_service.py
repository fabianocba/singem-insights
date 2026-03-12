from __future__ import annotations

from datetime import datetime
from math import exp
from typing import Any

from app.core.config import get_settings
from app.models.schemas_search import SearchRequest, SearchResponse, SearchResult, ScoreDetails
from app.repositories.ai_repository import AiRepository
from app.services.embedding_service import EmbeddingService
from app.utils.normalization import normalize_text
from app.utils.scoring import clamp_score, weighted_score
from app.utils.text_cleaning import clean_for_embedding


class SearchService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.ai_repository = AiRepository()
        self.embedding_service = EmbeddingService()

    def search(self, request: SearchRequest, feature_name: str = "search") -> SearchResponse:
        normalized_query = clean_for_embedding(request.query_text, max_len=self.settings.ai_search_max_text_size)
        if not normalized_query:
            return SearchResponse(
                query_text=request.query_text,
                page=request.page,
                page_size=request.page_size,
                total=0,
                results=[]
            )

        entity_types = self._normalize_entity_types(request.entity_types)
        candidate_limit = min(max(request.page * request.page_size * 4, 80), 600)

        text_rows = self.ai_repository.fetch_text_candidates(
            query_text=normalized_query,
            entity_types=entity_types,
            context_module=request.context_module,
            limit=candidate_limit
        )

        query_embedding = self.embedding_service.embed_text(normalized_query)
        vector_rows = self.ai_repository.fetch_vector_candidates(
            query_embedding=query_embedding,
            entity_types=entity_types,
            context_module=request.context_module,
            limit=candidate_limit
        )

        alias_scores = self.ai_repository.fetch_alias_scores(normalize_text(normalized_query))
        feedback_scores = self.ai_repository.fetch_feedback_scores(feature_name)
        history_scores = self.ai_repository.fetch_match_history_scores()

        ranked_results = self._rank_candidates(
            query_text=normalized_query,
            text_rows=text_rows,
            vector_rows=vector_rows,
            alias_scores=alias_scores,
            feedback_scores=feedback_scores,
            history_scores=history_scores,
            context_module=request.context_module
        )

        start = (request.page - 1) * request.page_size
        end = start + request.page_size
        page_items = ranked_results[start:end]

        return SearchResponse(
            query_text=request.query_text,
            page=request.page,
            page_size=request.page_size,
            total=len(ranked_results),
            results=page_items
        )

    def _normalize_entity_types(self, entity_types: list[str]) -> list[str]:
        out: list[str] = []
        seen: set[str] = set()
        for entity_type in entity_types:
            clean_value = str(entity_type or "").strip().lower()
            if not clean_value or clean_value in seen:
                continue
            seen.add(clean_value)
            out.append(clean_value)
        return out

    def _rank_candidates(
        self,
        query_text: str,
        text_rows: list[dict[str, Any]],
        vector_rows: list[dict[str, Any]],
        alias_scores: dict[tuple[str, str], float],
        feedback_scores: dict[tuple[str, str], float],
        history_scores: dict[tuple[str, str], float],
        context_module: str | None
    ) -> list[SearchResult]:
        merged: dict[tuple[str, str], dict[str, Any]] = {}

        def ensure_base(row: dict[str, Any]) -> dict[str, Any]:
            entity_type = str(row.get("entity_type") or "")
            entity_id = str(row.get("entity_id") or "")
            key = (entity_type, entity_id)
            base = merged.get(key)
            if base is not None:
                return base

            metadata = row.get("metadata_json")
            if not isinstance(metadata, dict):
                metadata = {}

            base = {
                "entity_type": entity_type,
                "entity_id": entity_id,
                "title": str(row.get("title") or ""),
                "content": str(row.get("content") or ""),
                "source_module": row.get("source_module"),
                "updated_at": row.get("updated_at"),
                "metadata": metadata,
                "textual": 0.0,
                "semantic": 0.0
            }
            merged[key] = base
            return base

        for row in text_rows:
            item = ensure_base(row)
            item["textual"] = max(float(item["textual"]), float(row.get("textual_score") or 0.0))

        for row in vector_rows:
            item = ensure_base(row)
            item["semantic"] = max(float(item["semantic"]), float(row.get("semantic_score") or 0.0))

        normalized_query = normalize_text(query_text)
        ranked: list[tuple[float, float, SearchResult]] = []

        for raw in merged.values():
            key = (raw["entity_type"], raw["entity_id"])
            title = str(raw["title"])
            content = str(raw["content"])
            title_norm = normalize_text(title)
            content_norm = normalize_text(content)

            rules = self._rules_score(
                normalized_query=normalized_query,
                title_normalized=title_norm,
                content_normalized=content_norm,
                alias_score=alias_scores.get(key, 0.0),
                source_module=raw.get("source_module"),
                context_module=context_module
            )
            popularity = self._popularity_score(raw.get("metadata") or {})
            feedback = self._feedback_score(feedback_scores.get(key), history_scores.get(key))

            score = weighted_score(
                textual=float(raw["textual"]),
                semantic=float(raw["semantic"]),
                rules=rules,
                popularity=popularity,
                feedback=feedback,
                w_textual=self.settings.ranking_weight_textual,
                w_semantic=self.settings.ranking_weight_semantic,
                w_rules=self.settings.ranking_weight_rules,
                w_popularity=self.settings.ranking_weight_popularity,
                w_feedback=self.settings.ranking_weight_feedback
            )

            score_details = ScoreDetails(
                final=round(score.final, 6),
                textual=round(score.textual, 6),
                semantic=round(score.semantic, 6),
                rules=round(score.rules, 6),
                popularity=round(score.popularity, 6),
                feedback=round(score.feedback, 6)
            )

            metadata = dict(raw.get("metadata") or {})
            metadata["source_module"] = raw.get("source_module")
            updated_at = raw.get("updated_at")
            if isinstance(updated_at, datetime):
                metadata["updated_at"] = updated_at.isoformat()

            result = SearchResult(
                entity_type=raw["entity_type"],
                entity_id=raw["entity_id"],
                title=title,
                snippet=self._build_snippet(content, normalized_query),
                score=score_details,
                explanation=self._build_explanation(score_details),
                metadata=metadata
            )
            ranked.append((score.final, self._timestamp_for_sort(updated_at), result))

        ranked.sort(key=lambda item: (item[0], item[1]), reverse=True)
        return [item[2] for item in ranked]

    def _timestamp_for_sort(self, value: Any) -> float:
        if not isinstance(value, datetime):
            return 0.0
        try:
            return float(value.timestamp())
        except (OverflowError, OSError, ValueError):
            return 0.0

    def _rules_score(
        self,
        normalized_query: str,
        title_normalized: str,
        content_normalized: str,
        alias_score: float,
        source_module: str | None,
        context_module: str | None
    ) -> float:
        score = clamp_score(alias_score)
        if normalized_query:
            if title_normalized == normalized_query:
                score = max(score, 1.0)
            elif title_normalized.startswith(normalized_query):
                score = max(score, 0.85)
            elif normalized_query in title_normalized:
                score = max(score, 0.72)
            elif normalized_query in content_normalized:
                score = max(score, 0.55)

        if context_module and source_module and str(source_module) == str(context_module):
            score = clamp_score(score + 0.1)

        return score

    def _popularity_score(self, metadata: dict[str, Any]) -> float:
        usage_count = metadata.get("usage_count")
        try:
            usage = max(0.0, float(usage_count or 0.0))
        except (TypeError, ValueError):
            usage = 0.0

        # Curva suave para evitar dominancia excessiva de itens muito usados.
        return clamp_score(1.0 - exp(-(usage / 18.0)))

    def _feedback_score(self, feedback_score: float | None, history_score: float | None) -> float:
        values: list[float] = []
        if feedback_score is not None:
            values.append(clamp_score(float(feedback_score)))
        if history_score is not None:
            values.append(clamp_score(float(history_score)))
        if not values:
            return 0.5
        return clamp_score(sum(values) / len(values))

    def _build_snippet(self, content: str, normalized_query: str, max_len: int = 180) -> str:
        plain = str(content or "").strip()
        if len(plain) <= max_len:
            return plain

        if normalized_query:
            normalized_content = normalize_text(plain)
            idx = normalized_content.find(normalized_query)
            if idx >= 0:
                start = max(0, idx - 40)
                end = min(len(plain), start + max_len)
                return plain[start:end].strip()

        return plain[:max_len].rstrip() + "..."

    def _build_explanation(self, score: ScoreDetails) -> str:
        reasons: list[str] = []
        if score.textual >= 0.65:
            reasons.append("forte aderencia textual")
        if score.semantic >= 0.65:
            reasons.append("proximidade semantica relevante")
        if score.rules >= 0.75:
            reasons.append("regras/aliases favoreceram o candidato")
        if score.popularity >= 0.60:
            reasons.append("uso recorrente no historico")
        if score.feedback >= 0.60:
            reasons.append("feedback positivo anterior")
        if not reasons:
            reasons.append("ranqueado por combinacao geral de sinais")
        return "; ".join(reasons)
