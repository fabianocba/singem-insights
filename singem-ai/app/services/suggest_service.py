from __future__ import annotations

from app.core.config import get_settings
from app.models.schemas_search import SearchRequest
from app.models.schemas_suggest import (
    SuggestFornecedorRequest,
    SuggestFornecedorResponse,
    SuggestItemRequest,
    SuggestItemResponse,
    SuggestionCandidate
)
from app.services.search_service import SearchService
from app.utils.normalization import normalize_cnpj, normalize_text
from app.utils.scoring import clamp_score


class SuggestService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.search_service = SearchService()

    def suggest_item(self, request: SuggestItemRequest) -> SuggestItemResponse:
        normalized_text = normalize_text(request.text)
        search_response = self.search_service.search(
            SearchRequest(
                query_text=request.text,
                entity_types=["material", "catmat_item"],
                context_module=request.context_module,
                page=1,
                page_size=max(request.limit * 4, 20)
            ),
            feature_name="suggest_item"
        )
        candidates = [self._to_candidate(result) for result in search_response.results][: request.limit + 1]
        main, alternatives = self._split_main_and_alternatives(candidates, request.limit)

        return SuggestItemResponse(
            normalized_text=normalized_text,
            suggestion_main=main,
            alternatives=alternatives
        )

    def suggest_fornecedor(self, request: SuggestFornecedorRequest) -> SuggestFornecedorResponse:
        normalized_text = normalize_text(request.text)
        normalized_cnpj = normalize_cnpj(request.cnpj or "") or None

        search_response = self.search_service.search(
            SearchRequest(
                query_text=request.text,
                entity_types=["fornecedor"],
                context_module=request.context_module,
                page=1,
                page_size=max(request.limit * 4, 20)
            ),
            feature_name="suggest_fornecedor"
        )

        candidates = [self._to_candidate(result) for result in search_response.results]
        if normalized_cnpj:
            for candidate in candidates:
                candidate_cnpj = normalize_cnpj(str(candidate.metadata.get("cnpj") or ""))
                if candidate_cnpj and candidate_cnpj == normalized_cnpj:
                    candidate.confidence = clamp_score(candidate.confidence + 0.12)
                    candidate.explanation = f"{candidate.explanation}; CNPJ compativel"

            candidates.sort(key=lambda item: item.confidence, reverse=True)

        main, alternatives = self._split_main_and_alternatives(candidates[: request.limit + 1], request.limit)
        return SuggestFornecedorResponse(
            normalized_text=normalized_text,
            normalized_cnpj=normalized_cnpj,
            suggestion_main=main,
            alternatives=alternatives
        )

    def _split_main_and_alternatives(
        self,
        candidates: list[SuggestionCandidate],
        limit: int
    ) -> tuple[SuggestionCandidate | None, list[SuggestionCandidate]]:
        if not candidates:
            return None, []

        main_candidate = candidates[0]
        if main_candidate.confidence < self.settings.confidence_review:
            return None, candidates[:limit]

        return main_candidate, candidates[1 : limit + 1]

    def _to_candidate(self, result) -> SuggestionCandidate:
        return SuggestionCandidate(
            entity_type=result.entity_type,
            entity_id=result.entity_id,
            title=result.title,
            confidence=clamp_score(result.score.final),
            explanation=result.explanation,
            metadata=dict(result.metadata or {})
        )
