import os
from functools import lru_cache
from urllib.parse import quote, unquote

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True
    )

    app_name: str = "SINGEM AI Core"
    app_env: str = "development"
    app_debug: bool = False
    app_version: str = "0.1.0"
    api_prefix: str = "/ai"

    internal_token: str = Field(default="change-me", alias="AI_INTERNAL_TOKEN")
    internal_token_header: str = "x-internal-token"

    database_url_override: str | None = Field(default=None, alias="DATABASE_URL")
    db_host: str = Field(default="postgres", alias="DB_HOST")
    db_port: int = Field(default=5432, alias="DB_PORT")
    db_name: str = Field(default="singem", alias="DB_NAME")
    db_user: str = Field(default="adm", alias="DB_USER")
    db_password: str = Field(default="change-me", alias="DB_PASSWORD")
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

    @staticmethod
    def _normalize_database_url_override(raw_url: str) -> str:
        url = raw_url.strip()
        if not url or "://" not in url:
            return url

        scheme, rest = url.split("://", 1)
        if "@" not in rest:
            return url

        netloc, slash, tail = rest.partition("/")
        auth, at_sign, host_port = netloc.rpartition("@")

        if not at_sign or ":" not in auth:
            return url

        username, password = auth.split(":", 1)
        encoded_username = quote(unquote(username), safe="")
        encoded_password = quote(unquote(password), safe="")

        rebuilt = f"{scheme}://{encoded_username}:{encoded_password}@{host_port}"
        if slash:
            rebuilt = f"{rebuilt}/{tail}"

        return rebuilt

    @property
    def database_url(self) -> str:
        db_fields = {"db_host", "db_port", "db_name", "db_user", "db_password"}
        db_env_vars = ("DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD")
        has_explicit_db_parts = bool(self.model_fields_set & db_fields) or any(
            str(os.getenv(var_name, "")).strip() for var_name in db_env_vars
        )

        if self.database_url_override and not has_explicit_db_parts:
            return self._normalize_database_url_override(self.database_url_override)

        user = quote(str(self.db_user), safe="")
        password = quote(str(self.db_password), safe="")
        host = str(self.db_host).strip() or "postgres"
        database = str(self.db_name).strip() or "singem"

        return f"postgresql://{user}:{password}@{host}:{int(self.db_port)}/{database}"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
