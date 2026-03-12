from typing import Any
from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    query_text: str = Field(min_length=1, max_length=4000)
    entity_types: list[str] = Field(default_factory=list)
    context_module: str | None = None
    filters: dict[str, Any] = Field(default_factory=dict)
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class ScoreDetails(BaseModel):
    final: float
    textual: float
    semantic: float
    rules: float
    popularity: float
    feedback: float


class SearchResult(BaseModel):
    entity_type: str
    entity_id: str
    title: str
    snippet: str
    score: ScoreDetails
    explanation: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class SearchResponse(BaseModel):
    ok: bool = True
    query_text: str
    page: int
    page_size: int
    total: int
    results: list[SearchResult]
