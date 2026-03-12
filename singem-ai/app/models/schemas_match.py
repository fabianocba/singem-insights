from typing import Any
from pydantic import BaseModel, Field


class MatchEntityRequest(BaseModel):
    source_entity_type: str
    source_entity_id: str | None = None
    source_text: str = Field(min_length=1, max_length=4000)
    target_entity_types: list[str] = Field(default_factory=list)
    context: dict[str, Any] = Field(default_factory=dict)
    limit: int = Field(default=10, ge=1, le=50)


class MatchCandidate(BaseModel):
    target_entity_type: str
    target_entity_id: str
    title: str
    confidence: float
    confidence_label: str
    reasons: list[str]
    metadata: dict[str, Any] = Field(default_factory=dict)


class MatchEntityResponse(BaseModel):
    ok: bool = True
    source_entity_type: str
    source_entity_id: str | None
    source_text: str
    matches: list[MatchCandidate]
