from pydantic import BaseModel, Field


class ReindexRequest(BaseModel):
    entity_types: list[str] = Field(default_factory=list)
    entity_id: str | None = Field(default=None, max_length=200)
    clear_first: bool = False


class ClearIndexRequest(BaseModel):
    entity_type: str | None = Field(default=None, max_length=100)
    entity_id: str | None = Field(default=None, max_length=200)


class ReindexResponse(BaseModel):
    ok: bool = True
    cleared: int = 0
    upserted: int = 0
    by_entity_type: dict[str, int] = Field(default_factory=dict)
