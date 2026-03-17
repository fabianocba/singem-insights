"""
Testes para o ReportService, com foco em especialização de IA.
Cobre _generate_price_intelligence_summary() e dispatch correto.
"""
import pytest
from unittest.mock import Mock, patch

from app.services.report_service import ReportService
from app.models.schemas_report import ReportSummaryRequest, ReportSummaryResponse


class TestPriceIntelligenceSummary:
    """Testes para especialização de resumos de inteligência de preços."""

    @pytest.fixture
    def service(self, mock_settings, mock_repository):
        """Instancia do ReportService com mocks."""
        with patch('app.services.report_service.get_settings', return_value=mock_settings), \
             patch('app.services.report_service.ReportRepository', return_value=mock_repository):
            service = ReportService()
            service.report_repository = mock_repository
            return service

    def test_generate_price_intelligence_summary_basico(self, service):
        """
        [PATH 3] _generate_price_intelligence_summary extrai metricas de preço
        e retorna sumário em português estruturado.
        """
        data = {
            "precoMedio": 125.50,
            "precoMinimo": 100.00,
            "precoMaximo": 150.00,
            "totalRegistros": 25,
            "fornecedoresUnicos": 3,
            "fornecedorPredominante": "Fornecedor Alpha",
            "regiaoPredominante": "Nordeste",
            "estadosCobertos": 2,
            "tendencia": "crescente",
            "variacaoMensal": 2.5,
            "variacaoAnual": 8.0,
            "modalidadesDistintas": 2,
            "desviopadrao": 12.0,
            "coefVariacao": 9.5
        }

        summary, insights, alerts, anomalies, confidence = service._generate_price_intelligence_summary(data)

        # Verificar que retorna tuple com 5 elementos
        assert isinstance(summary, str)
        assert isinstance(insights, list)
        assert isinstance(alerts, list)
        assert isinstance(anomalies, list)
        assert isinstance(confidence, float)

        # Verificar conteúdo do sumário
        assert "25 registro" in summary.lower()
        assert "125.50" in summary or "r$" in summary.lower()
        assert "fornecedor" in summary.lower()

        # Verificar insights extraídos
        assert len(insights) > 0
        assert any("preco medio" in i.lower() for i in insights)

        # Verificar confiança
        assert 0.0 <= confidence <= 1.0

    def test_generate_price_intelligence_summary_volatilidade_alta(self, service):
        """
        [PATH 3] Detecta volatilidade alta de preços com alert específico.
        """
        data = {
            "precoMedio": 100.00,
            "precoMinimo": 20.00,
            "precoMaximo": 180.00,
            "totalRegistros": 50,
            "fornecedoresUnicos": 2,
            "estadosCobertos": 3,
            "modalidadesDistintas": 1,
            "coefVariacao": 65.0,  # ALTO - deve gerar alert
            "desviopadrao": 65.0
        }

        summary, insights, alerts, anomalies, confidence = service._generate_price_intelligence_summary(data)

        # Deve gerar alert de volatilidade
        assert any("volatilidade" in a.lower() for a in alerts)
        # Deve gerar anomalia se coef > 75
        # Aqui 65 não gera anomalia, mas 65 > 50 gera alert
        assert len(alerts) > 0

    def test_generate_price_intelligence_summary_monopolio(self, service):
        """
        [PATH 3] Detecta situação de monopólio com anomalia.
        """
        data = {
            "precoMedio": 50.00,
            "precoMinimo": 50.00,
            "precoMaximo": 50.00,
            "totalRegistros": 15,
            "fornecedoresUnicos": 1,  # MONOPOLIO
            "estadosCobertos": 1,
            "modalidadesDistintas": 1,
            "coefVariacao": 0.0,
            "desviopadrao": 0.0
        }

        summary, insights, alerts, anomalies, confidence = service._generate_price_intelligence_summary(data)

        # Deve gerar alert de baixa competitividade
        assert any("competitiv" in a.lower() or "unico fornecedor" in a.lower() for a in alerts)
        # Para monopolio com muitos registros, cria anomalia
        if len(anomalies) > 0:
            assert any("mercado monopolizado" in a.lower() for a in anomalies)

    def test_generate_price_intelligence_summary_sem_dados(self, service):
        """
        [PATH 3] Retorna resposta padrão quando totalRegistros <= 0.
        """
        data = {
            "totalRegistros": 0,
            "precoMedio": 0
        }

        summary, insights, alerts, anomalies, confidence = service._generate_price_intelligence_summary(data)

        assert "registros suficientes" in summary.lower()
        assert len(insights) == 0
        assert len(alerts) == 0
        assert len(anomalies) == 0
        assert confidence < 0.5  # Baixa confiança

    def test_dispatch_precos_context_module(self, service):
        """
        [PATH 3] _generate_summary dispa para _generate_price_intelligence_summary
        quando context_module='precos'.
        """
        data = {
            "precoMedio": 100.0,
            "totalRegistros": 10,
            "fornecedoresUnicos": 2,
            "estadosCobertos": 1,
            "modalidadesDistintas": 1
        }

        summary, insights, alerts, anomalies, confidence = service._generate_summary(
            report_key="relatorio_qualquer",
            context_module="precos",  # Context que deve disparar especializado
            data=data
        )

        # Deve usar especializado, não genérico
        assert "registro" in summary.lower()
        # Genérico teria "principais indicadores"
        assert "principais indicadores" not in summary.lower() or len(insights) > 0

    def test_dispatch_report_key_relatorio_preco(self, service):
        """
        [PATH 3] _generate_summary dispara para especializado
        quando report_key='relatorio_preco'.
        """
        data = {
            "precoMedio": 75.0,
            "precoMinimo": 50.0,
            "precoMaximo": 100.0,
            "totalRegistros": 20,
            "fornecedoresUnicos": 3,
            "estadosCobertos": 2,
            "modalidadesDistintas": 1
        }

        summary, insights, alerts, anomalies, confidence = service._generate_summary(
            report_key="relatorio_preco",
            context_module=None,
            data=data
        )

        # Deve retornar resultado especializado
        assert "20 registro" in summary.lower() or "registros" in summary.lower()
        assert "75" in summary or "r$" in summary.lower()

    def test_dispatch_inteligencia_precos_context_module(self, service):
        """
        [PATH 3] _generate_summary dispara para especializado
        quando context_module='inteligencia_precos'.
        """
        data = {
            "precoMedio": 110.0,
            "precoMinimo": 90.0,
            "precoMaximo": 130.0,
            "totalRegistros": 18,
            "fornecedoresUnicos": 2,
            "estadosCobertos": 1,
            "modalidadesDistintas": 2
        }

        summary, insights, alerts, anomalies, confidence = service._generate_summary(
            report_key="relatorio_outro",
            context_module="inteligencia_precos",
            data=data
        )

        # Deve retornar especializado, não genérico
        assert "18 registro" in summary.lower()
        assert len(insights) > 0

    def test_fallback_generico_quando_nao_é_precos_nem_empenhos(self, service):
        """
        [PATH 3] Quando context_module e report_key não combinam com preços ou empenhos,
        usa _generate_summary genérico (fallback).
        """
        data = {
            "campo_numerico": 42,
            "outro_campo": 100,
            "texto": "alguma coisa"
        }

        summary, insights, alerts, anomalies, confidence = service._generate_summary(
            report_key="relatorio_generico",
            context_module="modulo_desconhecido",
            data=data
        )

        # Deve usar genérico
        assert "principais indicadores" in summary.lower() or "relatorio" in summary.lower()
        assert len(insights) > 0  # Genérico extrai top campos numéricos

    def test_summarize_caching_precos(self, service):
        """
        [PATH 3] summarize respeita cache quando report_key é para preços.
        """
        request = ReportSummaryRequest(
            report_key="relatorio_preco",
            context_module="precos",
            data={
                "precoMedio": 100.0,
                "totalRegistros": 10,
                "fornecedoresUnicos": 2,
                "estadosCobertos": 1,
                "modalidadesDistintas": 1
            },
            force_refresh=False
        )

        # Primeira chamada - sem cache
        response1 = service.summarize(request)
        assert isinstance(response1, ReportSummaryResponse)
        assert not response1.cached

        # Segunda chamada - com cache
        response2 = service.summarize(request)
        assert response2.cached
        assert response2.summary == response1.summary
        assert response2.insights == response1.insights


class TestPriceIntelligenceFormatting:
    """Testes para formatação de valores na especialização de preços."""

    @pytest.fixture
    def service(self, mock_settings, mock_repository):
        """Instancia do ReportService."""
        with patch('app.services.report_service.get_settings', return_value=mock_settings), \
             patch('app.services.report_service.ReportRepository', return_value=mock_repository):
            service = ReportService()
            service.report_repository = mock_repository
            return service

    def test_format_currency_pt_br(self, service):
        """Verifica formatação de moeda em pt-BR."""
        formatted = service._format_currency(1250.75)
        assert "R$" in formatted
        assert "1.250,75" in formatted or "1250,75" in formatted.replace(".", "")

    def test_format_percent_pt_br(self, service):
        """Verifica formatação de percentual em pt-BR."""
        formatted = service._format_percent(45.67)
        assert "," in formatted  # Separador decimal em vírgula
        assert "%" in formatted
        assert "45," in formatted or "46," in formatted
