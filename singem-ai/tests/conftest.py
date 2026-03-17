"""
Configuração de fixtures e setup para testes do singem-ai.
"""
import sys
from pathlib import Path

# Adicionar diretório da app ao path
app_path = Path(__file__).parent.parent
sys.path.insert(0, str(app_path))

import pytest


@pytest.fixture
def mock_settings():
    """Mock das configurações da aplicação."""
    class MockSettings:
        report_cache_ttl_seconds = 3600

    return MockSettings()


@pytest.fixture
def mock_repository():
    """Mock do repositório de reports."""
    class MockReportRepository:
        def __init__(self):
            self.cache_storage = {}

        def get_cache(self, report_key, params_hash):
            return self.cache_storage.get(f"{report_key}:{params_hash}")

        def save_cache(self, report_key, params_hash, summary_text, insights_json, ttl_seconds):
            self.cache_storage[f"{report_key}:{params_hash}"] = {
                "summary_text": summary_text,
                "insights_json": insights_json,
                "ttl_seconds": ttl_seconds
            }

    return MockReportRepository()
