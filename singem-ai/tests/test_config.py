from app.core.config import Settings


def test_database_url_is_built_from_db_parts_with_escaped_password() -> None:
    settings = Settings(
        db_host="postgres",
        db_port=5432,
        db_name="singem",
        db_user="adm",
        db_password="Singem@12345"
    )

    assert settings.database_url == "postgresql://adm:Singem%4012345@postgres:5432/singem"


def test_database_url_override_is_used_when_db_parts_are_not_explicitly_set() -> None:
    settings = Settings(database_url_override="postgresql://custom-user:custom-pass@db:5432/customdb")

    assert settings.database_url == "postgresql://custom-user:custom-pass@db:5432/customdb"


def test_database_url_override_with_at_sign_in_password_is_normalized() -> None:
    settings = Settings(database_url_override="postgresql://adm:Singem@12345@postgres:5432/singem")

    assert settings.database_url == "postgresql://adm:Singem%4012345@postgres:5432/singem"


def test_database_url_prefers_db_parts_from_environment(monkeypatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql://adm:Singem@12345@postgres:5432/singem")
    monkeypatch.setenv("DB_HOST", "postgres")
    monkeypatch.setenv("DB_PORT", "5432")
    monkeypatch.setenv("DB_NAME", "singem")
    monkeypatch.setenv("DB_USER", "adm")
    monkeypatch.setenv("DB_PASSWORD", "Singem@12345")

    settings = Settings()

    assert settings.database_url == "postgresql://adm:Singem%4012345@postgres:5432/singem"
