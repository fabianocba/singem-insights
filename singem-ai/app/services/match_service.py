from __future__ import annotations

from app.core.config import get_settings
from app.models.schemas_match import MatchCandidate, MatchEntityRequest, MatchEntityResponse
from app.models.schemas_search import SearchRequest
from app.repositories.ai_repository import AiRepository
from app.services.search_service import SearchService
from app.utils.scoring import clamp_score, confidence_label


class MatchService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.search_service = SearchService()
        self.ai_repository = AiRepository()

    def match_entity(self, request: MatchEntityRequest) -> MatchEntityResponse:
        target_entity_types = request.target_entity_types or ["material", "catmat_item", "fornecedor"]
        search_response = self.search_service.search(
            SearchRequest(
                query_text=request.source_text,
                entity_types=target_entity_types,
                context_module=str(request.context.get("context_module") or "") or None,
                page=1,
                page_size=max(request.limit * 3, request.limit)
            ),
            feature_name="match_entity"
        )

        matches: list[MatchCandidate] = []
        rows_to_save: list[dict] = []
        for result in search_response.results[: request.limit]:
            conf = clamp_score(result.score.final)
            label = confidence_label(
                conf,
                strong=self.settings.confidence_strong,
                probable=self.settings.confidence_probable,
                review=self.settings.confidence_review
            )
            reasons = [part.strip() for part in str(result.explanation).split(";") if part.strip()]

            match = MatchCandidate(
                target_entity_type=result.entity_type,
                target_entity_id=result.entity_id,
                title=result.title,
                confidence=conf,
                confidence_label=label,
                reasons=reasons,
                metadata=dict(result.metadata or {})
            )
            matches.append(match)

            rows_to_save.append(
                {
                    "target_entity_type": result.entity_type,
                    "target_entity_id": result.entity_id,
                    "match_type": "semantic" if result.score.semantic >= result.score.textual else "textual",
                    "confidence": conf,
                    "reasons": reasons,
                    "status": label
                }
            )

        self.ai_repository.save_match_suggestions(
            source_entity_type=request.source_entity_type,
            source_entity_id=request.source_entity_id,
            match_rows=rows_to_save
        )

        return MatchEntityResponse(
            source_entity_type=request.source_entity_type,
            source_entity_id=request.source_entity_id,
            source_text=request.source_text,
            matches=matches
        )
