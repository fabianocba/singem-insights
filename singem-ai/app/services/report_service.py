from __future__ import annotations

import hashlib
import json
from typing import Any

from app.core.config import get_settings
from app.models.schemas_report import ReportSummaryRequest, ReportSummaryResponse
from app.repositories.report_repository import ReportRepository
from app.utils.scoring import clamp_score


class ReportService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.report_repository = ReportRepository()

    def summarize(self, request: ReportSummaryRequest) -> ReportSummaryResponse:
        params_hash = self._build_params_hash(
            report_key=request.report_key,
            context_module=request.context_module,
            data=request.data
        )

        if not request.force_refresh:
            cached = self.report_repository.get_cache(request.report_key, params_hash)
            if cached:
                insights_json = cached.get("insights_json") if isinstance(cached.get("insights_json"), dict) else {}
                return ReportSummaryResponse(
                    report_key=request.report_key,
                    summary=str(cached.get("summary_text") or "Resumo indisponivel"),
                    insights=list(insights_json.get("insights") or []),
                    alerts=list(insights_json.get("alerts") or []),
                    anomalies=list(insights_json.get("anomalies") or []),
                    confidence=clamp_score(float(insights_json.get("confidence") or 0.5)),
                    cached=True
                )

        summary, insights, alerts, anomalies, confidence = self._generate_summary(
            report_key=request.report_key,
            context_module=request.context_module,
            data=request.data
        )

        self.report_repository.save_cache(
            report_key=request.report_key,
            params_hash=params_hash,
            summary_text=summary,
            insights_json={
                "insights": insights,
                "alerts": alerts,
                "anomalies": anomalies,
                "confidence": confidence
            },
            ttl_seconds=self.settings.report_cache_ttl_seconds
        )

        return ReportSummaryResponse(
            report_key=request.report_key,
            summary=summary,
            insights=insights,
            alerts=alerts,
            anomalies=anomalies,
            confidence=confidence,
            cached=False
        )

    def _build_params_hash(self, report_key: str, context_module: str | None, data: dict[str, Any]) -> str:
        payload = {
            "report_key": report_key,
            "context_module": context_module,
            "data": data
        }
        raw = json.dumps(payload, ensure_ascii=False, sort_keys=True, default=str)
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def _generate_summary(
        self,
        report_key: str,
        context_module: str | None,
        data: dict[str, Any]
    ) -> tuple[str, list[str], list[str], list[str], float]:
        numeric_fields: list[tuple[str, float]] = []
        non_null_fields = 0
        for key, value in data.items():
            if value is None:
                continue
            non_null_fields += 1
            if isinstance(value, bool):
                continue
            if isinstance(value, (int, float)):
                numeric_fields.append((key, float(value)))

        numeric_fields.sort(key=lambda item: abs(item[1]), reverse=True)

        insights = [f"{key}: {value:g}" for key, value in numeric_fields[:5]]
        alerts = self._collect_alerts(data)
        anomalies = self._collect_anomalies(data)

        module_text = f" no modulo {context_module}" if context_module else ""
        if not data:
            summary = f"Relatorio {report_key}{module_text} sem dados para analise."
        elif numeric_fields:
            top = ", ".join(f"{key}={value:g}" for key, value in numeric_fields[:3])
            summary = f"Relatorio {report_key}{module_text} processado com {len(data)} metricas; principais indicadores: {top}."
        else:
            summary = f"Relatorio {report_key}{module_text} processado com {len(data)} campos qualitativos."

        confidence = self._confidence_score(
            total_fields=len(data),
            non_null_fields=non_null_fields,
            numeric_count=len(numeric_fields),
            alerts_count=len(alerts),
            anomalies_count=len(anomalies)
        )
        return summary, insights, alerts, anomalies, confidence

    def _collect_alerts(self, data: dict[str, Any]) -> list[str]:
        alert_keys = ("erro", "falha", "penden", "atras", "inconsist", "bloqueio")
        alerts: list[str] = []
        for key, value in data.items():
            key_norm = str(key).lower()
            if not any(token in key_norm for token in alert_keys):
                continue
            if isinstance(value, bool) and value:
                alerts.append(f"{key}: ativo")
            elif isinstance(value, (int, float)) and float(value) > 0:
                alerts.append(f"{key}: {value:g}")
            elif isinstance(value, str) and value.strip():
                alerts.append(f"{key}: {value.strip()}")
        return alerts[:8]

    def _collect_anomalies(self, data: dict[str, Any]) -> list[str]:
        anomaly_keys = ("anom", "outlier", "desvio", "varia", "quebra")
        anomalies: list[str] = []
        for key, value in data.items():
            key_norm = str(key).lower()
            if not any(token in key_norm for token in anomaly_keys):
                continue
            if isinstance(value, bool):
                anomalies.append(f"{key}: {'ativo' if value else 'inativo'}")
            elif isinstance(value, (int, float)):
                anomalies.append(f"{key}: {value:g}")
            elif isinstance(value, str) and value.strip():
                anomalies.append(f"{key}: {value.strip()}")
        return anomalies[:8]

    def _confidence_score(
        self,
        total_fields: int,
        non_null_fields: int,
        numeric_count: int,
        alerts_count: int,
        anomalies_count: int
    ) -> float:
        if total_fields <= 0:
            return 0.35

        completeness = non_null_fields / max(total_fields, 1)
        numeric_density = numeric_count / max(total_fields, 1)
        signal_bonus = min(0.15, (alerts_count + anomalies_count) * 0.02)

        score = 0.45 + (0.25 * completeness) + (0.20 * numeric_density) + signal_bonus
        return clamp_score(score)
