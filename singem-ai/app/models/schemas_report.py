from typing import Any
from pydantic import BaseModel, Field


class ReportSummaryRequest(BaseModel):
    report_key: str = Field(min_length=1, max_length=200)
    context_module: str | None = None
    data: dict[str, Any] = Field(default_factory=dict)
    force_refresh: bool = False


class ReportSummaryResponse(BaseModel):
    ok: bool = True
    report_key: str
    summary: str
    insights: list[str] = Field(default_factory=list)
    alerts: list[str] = Field(default_factory=list)
    anomalies: list[str] = Field(default_factory=list)
    confidence: float
    cached: bool = False
