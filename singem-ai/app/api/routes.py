from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import get_settings
from app.core.security import require_internal_token
from app.models.schemas_feedback import FeedbackRequest, SimpleOkResponse
from app.models.schemas_index import ClearIndexRequest, ReindexRequest, ReindexResponse
from app.models.schemas_match import MatchEntityRequest, MatchEntityResponse
from app.models.schemas_report import ReportSummaryRequest, ReportSummaryResponse
from app.models.schemas_search import SearchRequest, SearchResponse
from app.models.schemas_suggest import (
    SuggestFornecedorRequest,
    SuggestFornecedorResponse,
    SuggestItemRequest,
    SuggestItemResponse
)
from app.repositories.ai_repository import AiRepository
from app.services.index_service import IndexService
from app.services.match_service import MatchService
from app.services.report_service import ReportService
from app.services.search_service import SearchService
from app.services.suggest_service import SuggestService

router = APIRouter()

_settings = get_settings()
_ai_repository = AiRepository()
_search_service = SearchService()
_suggest_service = SuggestService()
_match_service = MatchService()
_report_service = ReportService()
_index_service = IndexService()


def require_feature_enabled() -> None:
    if not _settings.ai_feature_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Modulo de IA esta desabilitado"
        )


def _raise_internal_error(action: str, exc: Exception) -> None:
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=f"Falha ao executar '{action}': {exc}"
    ) from exc


@router.get("/health")
def health() -> dict[str, Any]:
    db_ok = False
    pgvector_enabled = False
    error_messages: list[str] = []

    try:
        db_ok = bool(_ai_repository.healthcheck().get("ok", False))
    except Exception as exc:
        error_messages.append(f"db: {exc}")

    try:
        pgvector_enabled = bool(_ai_repository.pgvector_status().get("enabled", False))
    except Exception as exc:
        error_messages.append(f"pgvector: {exc}")

    return {
        "ok": db_ok,
        "service": _settings.app_name,
        "version": _settings.app_version,
        "env": _settings.app_env,
        "feature_enabled": _settings.ai_feature_enabled,
        "vector_search_enabled": _settings.enable_vector_search,
        "pgvector_enabled": pgvector_enabled,
        "errors": error_messages
    }


@router.post(
    "/search",
    response_model=SearchResponse,
    dependencies=[Depends(require_feature_enabled), Depends(require_internal_token)]
)
def search(request: SearchRequest) -> SearchResponse:
    try:
        return _search_service.search(request)
    except Exception as exc:
        _raise_internal_error("search", exc)


@router.post(
    "/suggest/item",
    response_model=SuggestItemResponse,
    dependencies=[Depends(require_feature_enabled), Depends(require_internal_token)]
)
def suggest_item(request: SuggestItemRequest) -> SuggestItemResponse:
    try:
        return _suggest_service.suggest_item(request)
    except Exception as exc:
        _raise_internal_error("suggest_item", exc)


@router.post(
    "/suggest/fornecedor",
    response_model=SuggestFornecedorResponse,
    dependencies=[Depends(require_feature_enabled), Depends(require_internal_token)]
)
def suggest_fornecedor(request: SuggestFornecedorRequest) -> SuggestFornecedorResponse:
    try:
        return _suggest_service.suggest_fornecedor(request)
    except Exception as exc:
        _raise_internal_error("suggest_fornecedor", exc)


@router.post(
    "/match/entity",
    response_model=MatchEntityResponse,
    dependencies=[Depends(require_feature_enabled), Depends(require_internal_token)]
)
def match_entity(request: MatchEntityRequest) -> MatchEntityResponse:
    try:
        return _match_service.match_entity(request)
    except Exception as exc:
        _raise_internal_error("match_entity", exc)


@router.post(
    "/report/summary",
    response_model=ReportSummaryResponse,
    dependencies=[Depends(require_feature_enabled), Depends(require_internal_token)]
)
def report_summary(request: ReportSummaryRequest) -> ReportSummaryResponse:
    try:
        return _report_service.summarize(request)
    except Exception as exc:
        _raise_internal_error("report_summary", exc)


@router.post(
    "/feedback",
    response_model=SimpleOkResponse,
    dependencies=[Depends(require_feature_enabled), Depends(require_internal_token)]
)
def save_feedback(request: FeedbackRequest) -> SimpleOkResponse:
    try:
        _ai_repository.save_feedback(
            feature_name=request.feature_name,
            query_text=request.query_text,
            suggested_entity_type=request.suggested_entity_type,
            suggested_entity_id=request.suggested_entity_id,
            accepted=request.accepted,
            user_id=request.user_id,
            context=request.context
        )
    except Exception as exc:
        _raise_internal_error("save_feedback", exc)

    return SimpleOkResponse(message="Feedback registrado com sucesso")


@router.post(
    "/index/rebuild",
    response_model=ReindexResponse,
    dependencies=[Depends(require_feature_enabled), Depends(require_internal_token)]
)
def rebuild_index(request: ReindexRequest) -> ReindexResponse:
    try:
        result = _index_service.rebuild(
            entity_types=request.entity_types,
            entity_id=request.entity_id,
            clear_first=request.clear_first
        )
    except Exception as exc:
        _raise_internal_error("rebuild_index", exc)

    return ReindexResponse(
        cleared=int(result.get("cleared", 0)),
        upserted=int(result.get("upserted", 0)),
        by_entity_type=dict(result.get("by_entity_type") or {})
    )


@router.post(
    "/index/clear",
    response_model=SimpleOkResponse,
    dependencies=[Depends(require_feature_enabled), Depends(require_internal_token)]
)
def clear_index(request: ClearIndexRequest) -> SimpleOkResponse:
    try:
        deleted = _index_service.clear(entity_type=request.entity_type, entity_id=request.entity_id)
    except Exception as exc:
        _raise_internal_error("clear_index", exc)

    return SimpleOkResponse(message=f"Documentos removidos: {deleted}")
