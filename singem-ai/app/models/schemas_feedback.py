from typing import Any

from pydantic import BaseModel, Field


class FeedbackRequest(BaseModel):
    feature_name: str = Field(min_length=1, max_length=120)
    query_text: str = Field(min_length=1, max_length=4000)
    suggested_entity_type: str = Field(min_length=1, max_length=100)
    suggested_entity_id: str = Field(min_length=1, max_length=200)
    accepted: bool
    user_id: str | None = Field(default=None, max_length=120)
    context: dict[str, Any] = Field(default_factory=dict)


class SimpleOkResponse(BaseModel):
    ok: bool = True
    message: str
