from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "SINGEM AI Core"
    app_env: str = "development"
    app_debug: bool = False
    app_version: str = "0.1.0"
    api_prefix: str = "/ai"

    internal_token: str = Field(default="change-me", alias="AI_INTERNAL_TOKEN")
    internal_token_header: str = "x-internal-token"

    database_url: str = Field(default="postgresql://singem_user:password@localhost:5432/singem", alias="DATABASE_URL")
    db_pool_min_size: int = 1
    db_pool_max_size: int = 10

    embedding_provider: str = "hash"
    embedding_model: str = "hash-embedding-v1"
    embedding_dimension: int = 384
    enable_vector_search: bool = True

    ai_search_max_text_size: int = 4000
    ai_search_default_page_size: int = 20
    ai_search_max_page_size: int = 100

    ranking_weight_textual: float = 0.35
    ranking_weight_semantic: float = 0.35
    ranking_weight_rules: float = 0.15
    ranking_weight_popularity: float = 0.10
    ranking_weight_feedback: float = 0.05

    confidence_strong: float = 0.90
    confidence_probable: float = 0.75
    confidence_review: float = 0.50

    report_cache_ttl_seconds: int = 3600

    ai_feature_enabled: bool = True


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
