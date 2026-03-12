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
        report_key_norm = str(report_key or "").strip().lower()
        context_module_norm = str(context_module or "").strip().lower()

        if context_module_norm == "empenhos" or report_key_norm == "relatorio_empenhos":
            return self._generate_empenhos_summary(data)

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

    def _generate_empenhos_summary(self, data: dict[str, Any]) -> tuple[str, list[str], list[str], list[str], float]:
        total_empenhos = self._as_int(data.get("total_empenhos"))
        valor_total = self._as_float(data.get("valor_total_empenhado"))
        valor_utilizado = self._as_float(data.get("valor_total_utilizado"))
        saldo_total = self._as_float(data.get("saldo_total_disponivel"))
        com_saldo = self._as_int(data.get("total_empenhos_com_saldo"))
        sem_saldo = self._as_int(data.get("total_empenhos_sem_saldo"))
        rascunhos = self._as_int(data.get("total_rascunhos_pendentes"))
        validados = self._as_int(data.get("total_validados"))
        ticket_medio = self._as_float(data.get("ticket_medio_empenho"))
        criticidade_alta = self._as_int(data.get("anomalia_empenhos_criticos"))
        concentracao_fornecedor = self._as_float(data.get("anomalia_concentracao_fornecedor_pct"))
        fornecedores_unicos = self._as_int(data.get("total_fornecedores_unicos"))
        anos_cobertos = self._as_int(data.get("total_anos_cobertos"))

        if total_empenhos > 0 and ticket_medio <= 0:
            ticket_medio = valor_total / total_empenhos

        percentual_validados = self._as_float(data.get("percentual_validados"))
        percentual_com_saldo = self._as_float(data.get("percentual_com_saldo"))
        percentual_sem_saldo = self._as_float(data.get("percentual_sem_saldo"))

        if total_empenhos > 0:
            if percentual_validados <= 0 and validados > 0:
                percentual_validados = (validados / total_empenhos) * 100
            if percentual_com_saldo <= 0 and com_saldo > 0:
                percentual_com_saldo = (com_saldo / total_empenhos) * 100
            if percentual_sem_saldo <= 0 and sem_saldo > 0:
                percentual_sem_saldo = (sem_saldo / total_empenhos) * 100

        if total_empenhos <= 0:
            return (
                "O recorte atual do relatorio de empenhos nao possui registros suficientes para analise.",
                [],
                [],
                [],
                0.45
            )

        resumo_partes = [
            (
                f"O recorte atual do relatorio de empenhos reune {total_empenhos} empenho(s), "
                f"com {self._format_currency(valor_total)} empenhados e {self._format_currency(valor_utilizado)} "
                "ja utilizados."
            ),
            (
                f"O saldo agregado disponivel e {self._format_currency(saldo_total)}, distribuido entre "
                f"{com_saldo} empenho(s) com saldo e {sem_saldo} sem saldo."
            )
        ]

        if validados > 0 or rascunhos > 0:
            resumo_partes.append(
                (
                    f"{validados} empenho(s) estao validados ({self._format_percent(percentual_validados)}) "
                    f"e {rascunhos} seguem em rascunho."
                )
            )

        if ticket_medio > 0:
            resumo_partes.append(f"O ticket medio por empenho esta em {self._format_currency(ticket_medio)}.")

        if fornecedores_unicos > 0 or anos_cobertos > 0:
            resumo_partes.append(
                f"O recorte cobre {fornecedores_unicos} fornecedor(es) distintos em {anos_cobertos} ano(s) de referencia."
            )

        insights = [
            f"Valor total empenhado: {self._format_currency(valor_total)}.",
            f"Saldo agregado atual: {self._format_currency(saldo_total)}.",
            f"Ticket medio por empenho: {self._format_currency(ticket_medio)}.",
            (
                f"Empenhos validados: {validados} "
                f"({self._format_percent(percentual_validados)} do total)."
            ),
            (
                f"Empenhos com saldo: {com_saldo} "
                f"({self._format_percent(percentual_com_saldo)} do total)."
            )
        ]

        alerts: list[str] = []
        if rascunhos > 0:
            alerts.append(f"{rascunhos} empenho(s) ainda estao em rascunho e dependem de validacao.")
        if sem_saldo > 0:
            alerts.append(f"{sem_saldo} empenho(s) estao sem saldo disponivel para novas vinculacoes.")
        if criticidade_alta > 0:
            alerts.append(f"{criticidade_alta} empenho(s) ja consumiram pelo menos 80% do valor empenhado.")

        anomalies: list[str] = []
        if concentracao_fornecedor >= 40:
            anomalies.append(
                f"Maior concentracao por fornecedor em {self._format_percent(concentracao_fornecedor)} do recorte."
            )
        if percentual_sem_saldo >= 60:
            anomalies.append(
                f"{self._format_percent(percentual_sem_saldo)} do recorte esta sem saldo disponivel."
            )
        if percentual_validados < 60:
            anomalies.append(
                f"Apenas {self._format_percent(percentual_validados)} do recorte esta validado."
            )

        non_null_fields = sum(1 for value in data.values() if value is not None)
        numeric_count = sum(1 for value in data.values() if isinstance(value, (int, float)) and not isinstance(value, bool))
        confidence = self._confidence_score(
            total_fields=len(data),
            non_null_fields=non_null_fields,
            numeric_count=numeric_count,
            alerts_count=len(alerts),
            anomalies_count=len(anomalies)
        )
        confidence = clamp_score(
            confidence
            + (0.05 if total_empenhos > 0 else 0.0)
            + (0.03 if ticket_medio > 0 else 0.0)
            + (0.02 if fornecedores_unicos > 0 else 0.0)
        )

        return (" ".join(resumo_partes), insights[:5], alerts[:4], anomalies[:4], confidence)

    def _as_float(self, value: Any) -> float:
        try:
            return float(value or 0)
        except (TypeError, ValueError):
            return 0.0

    def _as_int(self, value: Any) -> int:
        try:
            return int(float(value or 0))
        except (TypeError, ValueError):
            return 0

    def _format_currency(self, value: float) -> str:
        normalized = self._as_float(value)
        formatted = f"{normalized:,.2f}"
        return f"R$ {formatted.replace(',', '_').replace('.', ',').replace('_', '.')}"

    def _format_percent(self, value: float) -> str:
        normalized = self._as_float(value)
        return f"{normalized:.1f}".replace('.', ',') + "%"
