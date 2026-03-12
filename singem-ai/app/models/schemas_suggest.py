from typing import Any
from pydantic import BaseModel, Field


class SuggestItemRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    context_module: str | None = None
    hints: dict[str, Any] = Field(default_factory=dict)
    limit: int = Field(default=5, ge=1, le=20)


class SuggestFornecedorRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    cnpj: str | None = None
    context_module: str | None = None
    hints: dict[str, Any] = Field(default_factory=dict)
    limit: int = Field(default=5, ge=1, le=20)


class SuggestionCandidate(BaseModel):
    entity_type: str
    entity_id: str
    title: str
    confidence: float
    explanation: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class SuggestItemResponse(BaseModel):
    ok: bool = True
    normalized_text: str
    suggestion_main: SuggestionCandidate | None = None
    alternatives: list[SuggestionCandidate] = Field(default_factory=list)


class SuggestFornecedorResponse(BaseModel):
    ok: bool = True
    normalized_text: str
    normalized_cnpj: str | None = None
    suggestion_main: SuggestionCandidate | None = None
    alternatives: list[SuggestionCandidate] = Field(default_factory=list)
